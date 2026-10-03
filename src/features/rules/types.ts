import type { Rule, AppState } from '@/domain/types';

export interface RulesState {
  readonly rules: readonly Rule[];
  readonly appStates: Record<string, AppState>;
  readonly loading: boolean;
  readonly error: string | null;
}

export type RulesChangeListener = (state: RulesState) => void;
