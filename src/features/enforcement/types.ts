import type { Rule, AppState, EnforcementDecision } from '@/domain/types';

export interface EnforcementState {
  readonly monitoringActive: boolean;
  readonly blockedPackages: readonly string[];
  readonly totalIntercepts: number;
  readonly lastSyncedAt: number | null;
}

export type EnforcementChangeListener = (state: EnforcementState) => void;

export interface InterceptEvaluation {
  readonly decision: EnforcementDecision;
  readonly rule?: Rule;
  readonly appState?: AppState;
  readonly appName: string;
  readonly packageName: string;
}

export interface HealthCheckResult {
  readonly isHealthy: boolean;
  readonly issues: readonly string[];
  readonly repaired: boolean;
}
