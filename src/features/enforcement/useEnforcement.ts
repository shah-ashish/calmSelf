import { useCallback, useSyncExternalStore } from 'react';
import type { EnforcementState, InterceptEvaluation, HealthCheckResult } from './types';
import type { EnforcementController } from './EnforcementController';
import { getDefaultEnforcementController } from './defaultRepositories';

export interface UseEnforcementResult {
  readonly state: EnforcementState;
  readonly syncRulesToBlocker: () => Promise<EnforcementState>;
  readonly evaluateAppOpen: (packageName: string) => Promise<InterceptEvaluation>;
  readonly recordAppUsage: (packageName: string, elapsedSeconds: number) => Promise<unknown>;
  readonly drainIntercepts: () => Promise<number>;
  readonly healthCheck: () => Promise<HealthCheckResult>;
}

export function useEnforcement(customController?: EnforcementController): UseEnforcementResult {
  const controller = customController ?? getDefaultEnforcementController();

  const subscribe = useCallback(
    (onStoreChange: () => void) => controller.subscribe(onStoreChange),
    [controller]
  );

  const getSnapshot = useCallback(() => controller.getState(), [controller]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const syncRulesToBlocker = useCallback(async () => {
    return await controller.syncRulesToBlocker();
  }, [controller]);

  const evaluateAppOpen = useCallback(
    async (packageName: string) => {
      return await controller.evaluateAppOpen(packageName);
    },
    [controller]
  );

  const recordAppUsage = useCallback(
    async (packageName: string, elapsedSeconds: number) => {
      return await controller.recordAppUsage(packageName, elapsedSeconds);
    },
    [controller]
  );

  const drainIntercepts = useCallback(async () => {
    return await controller.drainIntercepts();
  }, [controller]);

  const healthCheck = useCallback(async () => {
    return await controller.healthCheck();
  }, [controller]);

  return {
    state,
    syncRulesToBlocker,
    evaluateAppOpen,
    recordAppUsage,
    drainIntercepts,
    healthCheck,
  };
}
