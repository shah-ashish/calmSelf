import type { Migration } from './types';
import { logger } from '@/lib/logger';

/**
 * MigrationRunner executes sequential schema migrations.
 * Ensures data safely upgrades from older schema versions to current targetVersion.
 */
export class MigrationRunner {
  private readonly migrations: readonly Migration[];

  constructor(migrations: readonly Migration[] = []) {
    // Validate no conflicting duplicate source versions
    const seen = new Set<number>();
    for (const m of migrations) {
      if (seen.has(m.fromVersion)) {
        throw new Error(
          `Conflicting migrations registered for fromVersion ${m.fromVersion}`
        );
      }
      if (m.toVersion <= m.fromVersion) {
        throw new Error(
          `Invalid migration fromVersion ${m.fromVersion} >= toVersion ${m.toVersion}`
        );
      }
      seen.add(m.fromVersion);
    }
    this.migrations = [...migrations].sort((a, b) => a.fromVersion - b.fromVersion);
  }

  /**
   * Migrates a payload from its current schemaVersion to targetVersion.
   * If payload has no schemaVersion, defaultFromVersion is assumed (defaults to 1).
   */
  async run<T = unknown>(
    rawData: unknown,
    targetVersion: number,
    defaultFromVersion = 1
  ): Promise<T> {
    if (rawData === null || typeof rawData !== 'object') {
      return rawData as T;
    }

    const record = rawData as Record<string, unknown>;
    const currentVersion =
      typeof record.schemaVersion === 'number'
        ? record.schemaVersion
        : defaultFromVersion;

    if (currentVersion === targetVersion) {
      return rawData as T;
    }

    if (currentVersion > targetVersion) {
      throw new Error(
        `Cannot downgrade schema from version ${currentVersion} to ${targetVersion}`
      );
    }

    let activeVersion = currentVersion;
    let currentPayload: unknown = rawData;

    while (activeVersion < targetVersion) {
      const step = this.migrations.find((m) => m.fromVersion === activeVersion);
      if (!step) {
        throw new Error(
          `No migration path available from version ${activeVersion} to ${targetVersion}`
        );
      }

      logger.info('Executing schema migration step', {
        fromVersion: step.fromVersion,
        toVersion: step.toVersion,
      });

      currentPayload = await step.migrate(currentPayload);
      activeVersion = step.toVersion;
    }

    // Ensure final schemaVersion is stamped
    if (currentPayload && typeof currentPayload === 'object' && !Array.isArray(currentPayload)) {
      return {
        ...(currentPayload as Record<string, unknown>),
        schemaVersion: targetVersion,
      } as T;
    }

    return currentPayload as T;
  }
}
