import type { Rule, AppState } from '@/domain/types';
import type { Result } from '@/lib/result';

export interface RuleRepository {
  getAll(): Promise<Result<readonly Rule[]>>;
  getById(id: string): Promise<Result<Rule | null>>;
  save(rule: Rule): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface AppStateRepository {
  getAll(): Promise<Result<readonly AppState[]>>;
  getByAppId(appId: string): Promise<Result<AppState | null>>;
  getByRuleId(ruleId: string): Promise<Result<readonly AppState[]>>;
  save(state: AppState): Promise<Result<void>>;
  saveMany(states: readonly AppState[]): Promise<Result<void>>;
  deleteByAppId(appId: string): Promise<Result<void>>;
  deleteByRuleId(ruleId: string): Promise<Result<void>>;
  resetForDate(dateString: string): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

