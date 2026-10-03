import type { AppState } from '@/domain/types';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import type { StorageAdapter } from '../storage/interface';
import type { AppStateRepository as IAppStateRepository } from './interfaces';
import { STORAGE } from '@/config/constants';
import { logger } from '@/lib/logger';

function isValidAppStateShape(item: unknown): item is AppState {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.appId === 'string' &&
    candidate.appId.trim().length > 0 &&
    typeof candidate.ruleId === 'string' &&
    typeof candidate.usedTodaySeconds === 'number' &&
    typeof candidate.usageDate === 'string' &&
    (candidate.lockedUntil === undefined || typeof candidate.lockedUntil === 'number')
  );
}

export class AppStateRepository implements IAppStateRepository {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly storageKey: string = STORAGE.APP_STATE_STORAGE_KEY
  ) {}

  async getAll(): Promise<Result<readonly AppState[]>> {
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (!raw) {
        return ok([]);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        logger.warn('Corrupted JSON in app state storage. Recovering with empty list.');
        return ok([]);
      }

      if (!Array.isArray(parsed)) {
        logger.warn('App state storage contained non-array data. Recovering with empty list.');
        return ok([]);
      }

      const validStates: AppState[] = [];
      for (const item of parsed) {
        if (isValidAppStateShape(item)) {
          validStates.push(item);
        } else {
          logger.warn('Skipping malformed app state record in stored collection.');
        }
      }

      return ok(validStates);
    } catch (error) {
      logger.error('Failed to read app states from storage', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getByAppId(appId: string): Promise<Result<AppState | null>> {
    const allResult = await this.getAll();
    if (!allResult.ok) {
      return allResult;
    }
    const found = allResult.value.find((s) => s.appId === appId) ?? null;
    return ok(found);
  }

  async getByRuleId(ruleId: string): Promise<Result<readonly AppState[]>> {
    const allResult = await this.getAll();
    if (!allResult.ok) {
      return allResult;
    }
    const matching = allResult.value.filter((s) => s.ruleId === ruleId);
    return ok(matching);
  }

  async save(state: AppState): Promise<Result<void>> {
    return this.saveMany([state]);
  }

  async saveMany(states: readonly AppState[]): Promise<Result<void>> {
    try {
      for (const s of states) {
        if (!isValidAppStateShape(s)) {
          const id = (s as Record<string, unknown> | null)?.appId;
          return err(
            new Error(`Invalid AppState shape for app: ${typeof id === 'string' ? id : 'unknown'}`)
          );
        }
      }

      const allResult = await this.getAll();
      const existingStates = allResult.ok ? [...allResult.value] : [];

      for (const incoming of states) {
        const idx = existingStates.findIndex((s) => s.appId === incoming.appId);
        if (idx >= 0) {
          existingStates[idx] = incoming;
        } else {
          existingStates.push(incoming);
        }
      }

      await this.storage.setItem(this.storageKey, JSON.stringify(existingStates));
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to persist app state records', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async deleteByAppId(appId: string): Promise<Result<void>> {
    try {
      const allResult = await this.getAll();
      if (!allResult.ok) {
        return allResult;
      }

      const filtered = allResult.value.filter((s) => s.appId !== appId);
      await this.storage.setItem(this.storageKey, JSON.stringify(filtered));
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to delete app state record', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async deleteByRuleId(ruleId: string): Promise<Result<void>> {
    try {
      const allResult = await this.getAll();
      if (!allResult.ok) {
        return allResult;
      }

      const filtered = allResult.value.filter((s) => s.ruleId !== ruleId);
      await this.storage.setItem(this.storageKey, JSON.stringify(filtered));
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to delete app states for rule', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async resetForDate(dateString: string): Promise<Result<void>> {
    try {
      const allResult = await this.getAll();
      if (!allResult.ok) {
        return allResult;
      }

      const updated = allResult.value.map((s) => {
        if (s.usageDate === dateString) {
          return s;
        }
        return {
          ...s,
          usedTodaySeconds: 0,
          usageDate: dateString,
        };
      });

      await this.storage.setItem(this.storageKey, JSON.stringify(updated));
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset app states for date rollover', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async clear(): Promise<Result<void>> {
    try {
      await this.storage.removeItem(this.storageKey);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear app state storage', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
