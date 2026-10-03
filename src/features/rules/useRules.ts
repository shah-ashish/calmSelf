import { useEffect, useCallback, useSyncExternalStore } from 'react';
import type { Rule, AppState } from '@/domain/types';
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

  return {
    rules: state.rules,
    appStates: state.appStates,
    loading: state.loading,
    error: state.error,
    refresh,
    toggleRule,
    undoPending,
    deleteRule,
  };
}
