import { useEffect, useCallback, useSyncExternalStore } from 'react';
import type { Rule, AppState } from '@/domain/types';
import type { RuleInput, RuleValidationError } from '@/domain/validation';
import type { Result } from '@/lib/result';
import { getDefaultRulesController } from './defaultRepositories';
import { RulesController } from './RulesController';

export interface UseRulesResult {
  readonly rules: readonly Rule[];
  readonly appStates: Record<string, AppState>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly toggleRule: (ruleId: string) => Promise<Result<Rule>>;
  readonly undoPending: (ruleId: string) => Promise<Result<Rule>>;
  readonly deleteRule: (ruleId: string) => Promise<Result<void>>;
  readonly createRule: (
    input: RuleInput
  ) => Promise<Result<Rule, readonly RuleValidationError[] | Error>>;
  readonly updateRule: (
    ruleId: string,
    input: RuleInput
  ) => Promise<Result<Rule, readonly RuleValidationError[] | Error>>;
  readonly getRuleById: (ruleId: string) => Rule | undefined;
  readonly getAssignedApps: (excludeRuleId?: string) => Map<string, string>;
}

export function useRules(customController?: RulesController): UseRulesResult {
  const controller = customController ?? getDefaultRulesController();

  const subscribe = useCallback(
    (onStoreChange: () => void) => controller.subscribe(onStoreChange),
    [controller]
  );

  const getSnapshot = useCallback(() => controller.getState(), [controller]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    void controller.load();
  }, [controller]);

  const refresh = useCallback(async () => {
    await controller.load();
  }, [controller]);

  const toggleRule = useCallback(
    async (ruleId: string) => {
      return await controller.toggleRule(ruleId);
    },
    [controller]
  );

  const undoPending = useCallback(
    async (ruleId: string) => {
      return await controller.undoPending(ruleId);
    },
    [controller]
  );

  const deleteRule = useCallback(
    async (ruleId: string) => {
      return await controller.deleteRule(ruleId);
    },
    [controller]
  );

  const createRule = useCallback(
    async (input: RuleInput) => {
      return await controller.createRule(input);
    },
    [controller]
  );

  const updateRule = useCallback(
    async (ruleId: string, input: RuleInput) => {
      return await controller.updateRule(ruleId, input);
    },
    [controller]
  );

  const getRuleById = useCallback(
    (ruleId: string) => {
      return controller.getRuleById(ruleId);
    },
    [controller]
  );

  const getAssignedApps = useCallback(
    (excludeRuleId?: string) => {
      return controller.getAssignedApps(excludeRuleId);
    },
    [controller]
  );

  return {
    rules: state.rules,
    appStates: state.appStates,
    loading: state.loading,
    error: state.error,
    refresh,
    toggleRule,
    undoPending,
    deleteRule,
    createRule,
    updateRule,
    getRuleById,
    getAssignedApps,
  };
}
