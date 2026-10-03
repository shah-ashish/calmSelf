import type { Rule, AppState, Clock } from '@/domain/types';
import { SystemClock } from '@/domain/time';
import { applyChangePolicy, undoPendingChange, applyDuePendingChanges } from '@/domain/changePolicy';
import type { RuleRepository, AppStateRepository } from '@/data/repositories/interfaces';
import type { RulesState, RulesChangeListener } from './types';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import { logger } from '@/lib/logger';

export class RulesController {
  private state: RulesState = {
    rules: [],
    appStates: {},
    loading: false,
    error: null,
  };

  private listeners = new Set<RulesChangeListener>();

  constructor(
    private readonly ruleRepo: RuleRepository,
    private readonly appStateRepo: AppStateRepository,
    private readonly clock: Clock = new SystemClock()
  ) {}

  getState(): RulesState {
    return this.state;
  }

  subscribe(listener: RulesChangeListener): () => void {
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
        logger.error('Error in RulesController listener', err);
      }
    }
  }

  /**
   * Loads rules and app states from storage.
   * Automatically executes any due pending changes (past midnight) and rolls over daily app usage.
   */
  async load(): Promise<RulesState> {
    this.state = { ...this.state, loading: true, error: null };
    this.notify();

    const rulesResult = await this.ruleRepo.getAll();
    if (!rulesResult.ok) {
      this.state = {
        ...this.state,
        loading: false,
        error: rulesResult.error.message,
      };
      this.notify();
      return this.state;
    }

    const now = this.clock.now();
    const todayDate = this.clock.todayDateString(now);

    // Apply any pending changes that are due (reached midnight)
    const processedRules: Rule[] = [];
    for (const rule of rulesResult.value) {
      if (rule.pendingChange && now >= rule.pendingChange.effectiveAt) {
        const updated = applyDuePendingChanges(rule, now);
        await this.ruleRepo.save(updated);
        processedRules.push(updated);
      } else {
        processedRules.push(rule);
      }
    }

    // Load AppStates
    const appStatesResult = await this.appStateRepo.getAll();
    const appStatesMap: Record<string, AppState> = {};

    if (appStatesResult.ok) {
      for (const appState of appStatesResult.value) {
        // Automatic midnight rollover: if usage date is not today, reset used seconds
        if (appState.usageDate !== todayDate) {
          const rolledOver: AppState = {
            ...appState,
            usedTodaySeconds: 0,
            usageDate: todayDate,
            // Preserve unexpired lock if still active
            lockedUntil:
              appState.lockedUntil && appState.lockedUntil > now
                ? appState.lockedUntil
                : undefined,
          };
          await this.appStateRepo.save(rolledOver);
          appStatesMap[appState.appId] = rolledOver;
        } else {
          appStatesMap[appState.appId] = appState;
        }
      }
    }

    this.state = {
      rules: processedRules,
      appStates: appStatesMap,
      loading: false,
      error: null,
    };
    this.notify();
    return this.state;
  }

  /**
   * Toggles rule enabled/disabled status.
   * Tightening (turning ON): applies immediately.
   * Loosening (turning OFF): applies from next local midnight via asymmetric policy.
   */
  async toggleRule(ruleId: string): Promise<Result<Rule>> {
    const rule = this.state.rules.find((r) => r.id === ruleId);
    if (!rule) {
      return err(new Error(`Rule not found with id: ${ruleId}`));
    }

    let updatedRule: Rule;

    if (!rule.enabled) {
      // Turning ON = Tightening (instant)
      // Also clear any pending disable change if previously staged
      const baseRule = rule.pendingChange ? undoPendingChange(rule) : rule;
      updatedRule = {
        ...baseRule,
        enabled: true,
      };
    } else {
      // Turning OFF = Loosening (next local midnight)
      const nextMidnight = this.clock.nextLocalMidnight(this.clock.now());
      const splitResult = applyChangePolicy(rule, { enabled: false }, nextMidnight);
      updatedRule = splitResult.updatedRule;
    }

    const saveResult = await this.ruleRepo.save(updatedRule);
    if (!saveResult.ok) {
      return err(saveResult.error);
    }

    this.state = {
      ...this.state,
      rules: this.state.rules.map((r) => (r.id === ruleId ? updatedRule : r)),
    };
    this.notify();
    return ok(updatedRule);
  }

  /**
   * Undoes any pending loosening change on the rule.
   */
  async undoPending(ruleId: string): Promise<Result<Rule>> {
    const rule = this.state.rules.find((r) => r.id === ruleId);
    if (!rule) {
      return err(new Error(`Rule not found with id: ${ruleId}`));
    }

    if (!rule.pendingChange) {
      return ok(rule);
    }

    const reverted = undoPendingChange(rule);
    const saveResult = await this.ruleRepo.save(reverted);
    if (!saveResult.ok) {
      return err(saveResult.error);
    }

    this.state = {
      ...this.state,
      rules: this.state.rules.map((r) => (r.id === ruleId ? reverted : r)),
    };
    this.notify();
    return ok(reverted);
  }

  /**
   * Deletes a rule and associated app states.
   */
  async deleteRule(ruleId: string): Promise<Result<void>> {
    const deleteResult = await this.ruleRepo.delete(ruleId);
    if (!deleteResult.ok) {
      return err(deleteResult.error);
    }

    const rule = this.state.rules.find((r) => r.id === ruleId);

    // Clean up app states mapped to this rule
    await this.appStateRepo.deleteByRuleId(ruleId);

    const remainingAppStates = { ...this.state.appStates };
    if (rule) {
      for (const appId of rule.appIds) {
        delete remainingAppStates[appId];
      }
    }

    this.state = {
      ...this.state,
      rules: this.state.rules.filter((r) => r.id !== ruleId),
      appStates: remainingAppStates,
    };
    this.notify();
    return ok(undefined);
  }
}
