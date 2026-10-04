import type { Clock } from '@/domain/types';
import { SystemClock } from '@/domain/time';
import { logger } from '@/lib/logger';
import type { RulesController } from '@/features/rules/RulesController';
import type { PermissionsController } from '@/features/permissions/PermissionsController';
import type { EnforcementController } from '@/features/enforcement/EnforcementController';
import type { LifecycleTransitionResult, LifecycleListener } from './types';

/**
 * AppLifecycleCoordinator coordinates background-to-foreground transitions and midnight rollover.
 * When the app becomes active, it triggers:
 * 1. Permissions verification across the platform
 * 2. RulesController load() to apply due pending loosening changes and perform automatic midnight usage resets
 * 3. EnforcementController watchdog healthCheck() to repair killed background services and drain intercepts
 */
export class AppLifecycleCoordinator {
  private currentAppState: string = 'unknown';
  private readonly listeners = new Set<LifecycleListener>();

  constructor(
    private readonly rulesController: RulesController,
    private readonly permissionsController: PermissionsController,
    private readonly enforcementController: EnforcementController,
    private readonly clock: Clock = new SystemClock()
  ) {}

  getCurrentAppState(): string {
    return this.currentAppState;
  }

  subscribe(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(result: LifecycleTransitionResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (err) {
        logger.error('Error in AppLifecycleCoordinator listener', err);
      }
    }
  }

  /**
   * Initializes state on initial app boot.
   */
  async initialize(): Promise<LifecycleTransitionResult> {
    return await this.handleAppStateChange('active');
  }

  /**
   * Handles OS AppState change transitions ('active', 'background', 'inactive').
   */
  async handleAppStateChange(nextAppState: string): Promise<LifecycleTransitionResult> {
    const previousState = this.currentAppState;
    this.currentAppState = nextAppState;

    if (nextAppState !== 'active') {
      const result: LifecycleTransitionResult = {
        appState: nextAppState,
        midnightRolloverChecked: false,
        permissionsChecked: false,
        healthCheck: null,
      };
      this.notify(result);
      return result;
    }

    logger.info(`App transitioning to active from ${previousState}. Running lifecycle synchronization.`);

    // 1. Refresh permissions status
    let permissionsChecked = false;
    try {
      await this.permissionsController.handleAppStateChange('active');
      permissionsChecked = true;
    } catch (err) {
      logger.error('AppLifecycleCoordinator failed to refresh permissions', err);
    }

    // 2. Load rules to apply due pending changes and trigger automatic midnight rollover
    let midnightRolloverChecked = false;
    try {
      await this.rulesController.load();
      midnightRolloverChecked = true;
    } catch (err) {
      logger.error('AppLifecycleCoordinator failed to reload rules & rollover usage', err);
    }

    // 3. Run enforcement watchdog to self-heal and drain intercepts
    let healthCheck = null;
    try {
      healthCheck = await this.enforcementController.healthCheck();
    } catch (err) {
      logger.error('AppLifecycleCoordinator watchdog check failed', err);
    }

    const result: LifecycleTransitionResult = {
      appState: nextAppState,
      midnightRolloverChecked,
      permissionsChecked,
      healthCheck,
    };

    this.notify(result);
    return result;
  }
}
