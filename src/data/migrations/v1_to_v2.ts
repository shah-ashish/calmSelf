import type { Migration } from './types';

/**
 * Example migration upgrading schema from version 1 to version 2.
 * Adds optional category or tags metadata while preserving all existing rule fields.
 */
export const migrationV1ToV2: Migration = {
  fromVersion: 1,
  toVersion: 2,
  migrate(rawData: unknown): unknown {
    if (typeof rawData !== 'object' || rawData === null) {
      return rawData;
    }

    const rule = rawData as Record<string, unknown>;
    return {
      ...rule,
      tags: Array.isArray(rule.tags) ? rule.tags : [],
      schemaVersion: 2,
    };
  },
};
