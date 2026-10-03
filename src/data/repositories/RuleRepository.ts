import type { Rule } from '@/domain/types';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import type { StorageAdapter } from '../storage/interface';
import type { RuleRepository as IRuleRepository } from './interfaces';
import { STORAGE } from '@/config/constants';
import { logger } from '@/lib/logger';
import { validateRuleInput } from '@/domain/validation';
import type { MigrationRunner } from '../migrations/MigrationRunner';

/**
 * Validates whether an unknown payload conforms to a valid Rule shape.
 */
function isValidRuleShape(item: unknown): item is Rule {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    Array.isArray(candidate.messages) &&
    typeof candidate.limitMinutes === 'number' &&
    typeof candidate.delaySeconds === 'number' &&
    typeof candidate.blockMinutes === 'number' &&
    Array.isArray(candidate.appIds) &&
    typeof candidate.enabled === 'boolean'
  );
}

export class RuleRepository implements IRuleRepository {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly migrationRunner?: MigrationRunner,
    private readonly storageKey: string = STORAGE.RULE_STORAGE_KEY,
    private readonly targetVersion: number = STORAGE.CURRENT_SCHEMA_VERSION
  ) {}

  async getAll(): Promise<Result<readonly Rule[]>> {
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (!raw) {
        return ok([]);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        logger.warn('Corrupted JSON encountered in rule storage. Recovering with empty list.');
        return ok([]);
      }

      if (!Array.isArray(parsed)) {
        logger.warn('Rule storage contained non-array data. Recovering with empty list.');
        return ok([]);
      }

      const validRules: Rule[] = [];
      for (const item of parsed) {
        let ruleCandidate = item;

        // Apply migrations if migration runner is present
        if (this.migrationRunner && typeof ruleCandidate === 'object' && ruleCandidate !== null) {
          try {
            ruleCandidate = await this.migrationRunner.run(
              ruleCandidate,
              this.targetVersion
            );
          } catch (migrationErr) {
            logger.error('Failed to migrate rule schema, skipping corrupt entry', migrationErr);
            continue;
          }
        }

        if (isValidRuleShape(ruleCandidate)) {
          validRules.push(ruleCandidate);
        } else {
          logger.warn('Skipping malformed rule entry in stored collection.');
        }
      }

      return ok(validRules);
    } catch (error) {
      logger.error('Failed to read rules from storage', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getById(id: string): Promise<Result<Rule | null>> {
    const allResult = await this.getAll();
    if (!allResult.ok) {
      return allResult;
    }
    const found = allResult.value.find((r) => r.id === id) ?? null;
    return ok(found);
  }

  async save(rule: Rule): Promise<Result<void>> {
    try {
      // Validate rule inputs against domain invariants
      const validation = validateRuleInput({
        messages: rule.messages,
        limitMinutes: rule.limitMinutes,
        delaySeconds: rule.delaySeconds,
        blockMinutes: rule.blockMinutes,
        appIds: rule.appIds,
      });

      if (!validation.ok) {
        const errorMsg = validation.error.map((e) => e.message).join('; ');
        return err(new Error(`Rule validation failed: ${errorMsg}`));
      }

      const allResult = await this.getAll();
      const existingRules = allResult.ok ? [...allResult.value] : [];

      const ruleToPersist: Rule = {
        ...rule,
        schemaVersion: this.targetVersion,
      };

      const existingIndex = existingRules.findIndex((r) => r.id === rule.id);
      if (existingIndex >= 0) {
        existingRules[existingIndex] = ruleToPersist;
      } else {
        existingRules.push(ruleToPersist);
      }

      await this.storage.setItem(this.storageKey, JSON.stringify(existingRules));
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to save rule to storage', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const allResult = await this.getAll();
      if (!allResult.ok) {
        return allResult;
      }

      const filtered = allResult.value.filter((r) => r.id !== id);
      await this.storage.setItem(this.storageKey, JSON.stringify(filtered));
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to delete rule from storage', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async clear(): Promise<Result<void>> {
    try {
      await this.storage.removeItem(this.storageKey);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear rule storage', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
