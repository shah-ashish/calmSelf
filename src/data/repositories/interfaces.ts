import type { Rule, AppState } from '@/domain/types';
import type { Result } from '@/lib/result';

export interface RuleRepository {
  getAll(): Promise<Result<readonly Rule[]>>;
  getById(id: string): Promise<Result<Rule | null>>;
  save(rule: Rule): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}

export interface AppStateRepository {
  getByAppId(appId: string): Promise<Result<AppState | null>>;
  save(state: AppState): Promise<Result<void>>;
  resetForDate(dateString: string): Promise<Result<void>>;
}
