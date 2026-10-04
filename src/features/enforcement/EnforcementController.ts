import type { Clock, AppState } from '@/domain/types';
import { SystemClock } from '@/domain/time';
import { evaluateEnforcement, recordUsageTick } from '@/domain/ruleEngine';
import type { RuleRepository, AppStateRepository } from '@/data/repositories/interfaces';
import type { BlockerAdapter } from '@/platform/blocker/interface';
import { resolveAppMetadata } from '@/features/rules/utils/appName';
import { logger } from '@/lib/logger';
import type {
  EnforcementState,
  EnforcementChangeListener,
  InterceptEvaluation,
  HealthCheckResult,
} from './types';

export class EnforcementController {
  private state: EnforcementState = {
    monitoringActive: false,
    blockedPackages: [],
    totalIntercepts: 0,
    lastSyncedAt: null,
  };

  private listeners = new Set<EnforcementChangeListener>();

  constructor(
    private readonly ruleRepo: RuleRepository,
    private readonly appStateRepo: AppStateRepository,
    private readonly blocker: BlockerAdapter,
    private readonly clock: Clock = new SystemClock(),
    rulesController?: { subscribe: (listener: () => void) => () => void }
  ) {
    if (rulesController) {
      rulesController.subscribe(() => {
        void this.syncRulesToBlocker();
      });
    }
  }

  getState(): EnforcementState {
    return this.state;
  }

  subscribe(listener: EnforcementChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        logger.error('Error in EnforcementController listener', err);
      }
    }
  }

  /**
   * Synchronizes active rules with the platform blocker service.
   * Gathers all packages from enabled rules, configures the native watcher,
   * and starts or stops the background monitoring service based on permissions and active rules.
   */
  async syncRulesToBlocker(): Promise<EnforcementState> {
    const rulesResult = await this.ruleRepo.getAll();
    const rules = rulesResult.ok ? rulesResult.value : [];

    // Filter packages that belong to active/enabled rules
    const activePackagesSet = new Set<string>();
    for (const rule of rules) {
      if (rule.enabled) {
        for (const appId of rule.appIds) {
          activePackagesSet.add(appId);
        }
      }
    }

    const blockedPackages = Array.from(activePackagesSet);

    // Sync package list with native blocker
    await this.blocker.setBlockedPackages(blockedPackages);

    // Configure overlay appearance
    await this.blocker.configureOverlay({
      title: 'Mindful Pause',
      text: 'Taking a breath before opening...',
      backgroundColor: '#F8FAFC',
    });

    // Check permissions before activating the background service
    const perms = await this.blocker.checkPermissions();
    const canMonitor =
      perms.overlayGranted && perms.usageAccessGranted && blockedPackages.length > 0;

    if (canMonitor) {
      await this.blocker.startService();
    } else {
      await this.blocker.stopService();
    }

    this.state = {
      ...this.state,
      monitoringActive: canMonitor,
      blockedPackages,
      lastSyncedAt: this.clock.now(),
    };

    this.notify();
    return this.state;
  }

  /**
   * Evaluates an app open event and returns an enforcement decision:
   * 'allow' (unrestricted), 'show_message' (delay countdown + mindful reflection), or 'lock' (cooldown active).
   */
  async evaluateAppOpen(
    packageName: string,
    randomSelector?: (max: number) => number
  ): Promise<InterceptEvaluation> {
    const meta = resolveAppMetadata(packageName);
    const now = this.clock.now();
    const todayDate = this.clock.todayDateString(now);

    const rulesResult = await this.ruleRepo.getAll();
    const rules = rulesResult.ok ? rulesResult.value : [];

    const rule = rules.find((r) => r.appIds.includes(packageName));

    if (!rule || !rule.enabled) {
      return {
        decision: { type: 'allow' },
        appName: meta.name,
        packageName,
      };
    }

    // Load or create initial AppState
    const appStateResult = await this.appStateRepo.getByAppId(packageName);
    let appState: AppState;

    if (appStateResult.ok && appStateResult.value) {
      appState = appStateResult.value;
    } else {
      appState = {
        appId: packageName,
        ruleId: rule.id,
        usedTodaySeconds: 0,
        usageDate: todayDate,
      };
      await this.appStateRepo.save(appState);
    }

    const decision = evaluateEnforcement(rule, appState, now, { randomSelector });

    // If decision is lock and appState is not yet locked, persist the lock state
    if (decision.type === 'lock' && appState.lockedUntil !== decision.lockedUntil) {
      const updatedState: AppState = {
        ...appState,
        lockedUntil: decision.lockedUntil,
      };
      await this.appStateRepo.save(updatedState);
      appState = updatedState;
    }

    return {
      decision,
      rule,
      appState,
      appName: meta.name,
      packageName,
    };
  }

  /**
   * Records elapsed usage seconds for a protected app.
   * If usage exceeds the rule's daily limit, automatically triggers cooldown lock.
   */
  async recordAppUsage(packageName: string, elapsedSeconds: number): Promise<AppState | null> {
    const now = this.clock.now();
    const rulesResult = await this.ruleRepo.getAll();
    const rules = rulesResult.ok ? rulesResult.value : [];
    const rule = rules.find((r) => r.appIds.includes(packageName));

    if (!rule) return null;

    const appStateResult = await this.appStateRepo.getByAppId(packageName);
    if (!appStateResult.ok || !appStateResult.value) return null;

    const appState = appStateResult.value;
    let updated = recordUsageTick(appState, elapsedSeconds, now);

    // Check if limit is now reached
    const limitSeconds = rule.limitMinutes * 60;
    if (updated.usedTodaySeconds >= limitSeconds && !updated.lockedUntil) {
      const lockUntil = now + rule.blockMinutes * 60 * 1000;
      updated = {
        ...updated,
        lockedUntil: lockUntil,
      };
    }

    await this.appStateRepo.save(updated);
    return updated;
  }

  /**
   * Drains pending intercepts from the native module buffer.
   */
  async drainIntercepts(): Promise<number> {
    const intercepts = await this.blocker.drainPendingIntercepts();
    if (intercepts.length > 0) {
      this.state = {
        ...this.state,
        totalIntercepts: this.state.totalIntercepts + intercepts.length,
      };
      this.notify();
    }
    return intercepts.length;
  }

  /**
   * Temporarily suppresses blocking on Android native watcher for durationMinutes.
   * After durationMinutes of foreground use, native watcher automatically re-blocks.
   */
  async temporaryUnlock(durationMinutes: number): Promise<void> {
    await this.blocker.temporaryUnlock(durationMinutes);
  }

  /**
   * Watchdog self-healing health check.
   * Verifies blocker permissions, rule synchronization consistency, and drains pending intercepts.
   * Automatically repairs out-of-sync package lists or dead background monitoring services.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const issues: string[] = [];
    let repaired = false;

    // 1. Drain pending intercepts
    try {
      await this.drainIntercepts();
    } catch (err) {
      logger.error('Watchdog failed to drain intercepts', err);
      issues.push('Failed to drain pending intercepts');
    }

    // 2. Verify platform permissions
    let perms;
    try {
      perms = await this.blocker.checkPermissions();
      if (!perms.overlayGranted) {
        issues.push('Overlay permission not granted');
      }
      if (!perms.usageAccessGranted) {
        issues.push('Usage access permission not granted');
      }
    } catch (err) {
      logger.error('Watchdog failed to check permissions', err);
      issues.push('Failed to check permissions');
      return { isHealthy: false, issues, repaired: false };
    }

    // 3. Verify rule synchronization
    const rulesResult = await this.ruleRepo.getAll();
    const rules = rulesResult.ok ? rulesResult.value : [];
    const expectedPackagesSet = new Set<string>();
    for (const rule of rules) {
      if (rule.enabled) {
        for (const appId of rule.appIds) {
          expectedPackagesSet.add(appId);
        }
      }
    }

    const expectedPackages = Array.from(expectedPackagesSet).sort();
    const currentPackages = [...this.state.blockedPackages].sort();
    const packagesMatch =
      expectedPackages.length === currentPackages.length &&
      expectedPackages.every((pkg, idx) => pkg === currentPackages[idx]);

    const canMonitor =
      perms.overlayGranted && perms.usageAccessGranted && expectedPackages.length > 0;
    const monitoringStatusMatches = this.state.monitoringActive === canMonitor;

    const needsResync =
      !packagesMatch ||
      !monitoringStatusMatches ||
      this.state.lastSyncedAt === null;

    if (needsResync) {
      try {
        await this.syncRulesToBlocker();
        repaired = true;
      } catch (err) {
        logger.error('Watchdog failed to resync blocker', err);
        issues.push('Failed to resync blocker service');
      }
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      repaired,
    };
  }
}
