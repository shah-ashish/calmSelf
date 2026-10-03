import type { HealthCheckResult } from '@/features/enforcement/types';

export interface LifecycleTransitionResult {
  readonly appState: string;
  readonly midnightRolloverChecked: boolean;
  readonly permissionsChecked: boolean;
  readonly healthCheck: HealthCheckResult | null;
}

export type LifecycleListener = (result: LifecycleTransitionResult) => void;
