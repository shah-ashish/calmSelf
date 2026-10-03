import { MigrationRunner } from '@/data/migrations/MigrationRunner';
import type { Migration } from '@/data/migrations/types';
import { migrationV1ToV2 } from '@/data/migrations/v1_to_v2';

describe('MigrationRunner', () => {
  it('instantiates with empty migrations list', () => {
    const runner = new MigrationRunner();
    expect(runner).toBeDefined();
  });

  it('rejects conflicting fromVersion migrations in constructor', () => {
    const dup1: Migration = { fromVersion: 1, toVersion: 2, migrate: (d) => d };
    const dup2: Migration = { fromVersion: 1, toVersion: 3, migrate: (d) => d };

    expect(() => new MigrationRunner([dup1, dup2])).toThrow(
      'Conflicting migrations registered for fromVersion 1'
    );
  });

  it('rejects invalid migration where fromVersion >= toVersion', () => {
    const invalid: Migration = { fromVersion: 2, toVersion: 1, migrate: (d) => d };
    expect(() => new MigrationRunner([invalid])).toThrow('Invalid migration');
  });

  it('returns raw data unchanged if targetVersion equals currentVersion', async () => {
    const runner = new MigrationRunner();
    const data = { id: 'r1', schemaVersion: 1 };
    const result = await runner.run(data, 1);
    expect(result).toEqual(data);
  });

  it('returns null or non-objects untouched', async () => {
    const runner = new MigrationRunner();
    expect(await runner.run(null, 2)).toBeNull();
    expect(await runner.run(1234, 2)).toBe(1234);
  });

  it('throws error when attempting a schema downgrade', async () => {
    const runner = new MigrationRunner();
    const higherVersionData = { id: 'r1', schemaVersion: 3 };
    await expect(runner.run(higherVersionData, 1)).rejects.toThrow(
      'Cannot downgrade schema from version 3 to 1'
    );
  });

  it('throws error when migration path is missing', async () => {
    const runner = new MigrationRunner([
      { fromVersion: 2, toVersion: 3, migrate: (d) => d },
    ]);
    const v1Data = { id: 'r1', schemaVersion: 1 };
    await expect(runner.run(v1Data, 3)).rejects.toThrow(
      'No migration path available from version 1 to 3'
    );
  });

  it('upgrades sample version-1 data to a newer version (v1 -> v2)', async () => {
    const runner = new MigrationRunner([migrationV1ToV2]);

    const sampleV1Data = {
      id: 'rule-test-1',
      messages: ['Please take a breath.'],
      limitMinutes: 30,
      delaySeconds: 10,
      blockMinutes: 60,
      appIds: ['com.example.app'],
      enabled: true,
      schemaVersion: 1,
    };

    const migrated = await runner.run<Record<string, unknown>>(sampleV1Data, 2);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.id).toBe('rule-test-1');
    expect(migrated.tags).toEqual([]); // New field added by migrationV1ToV2
    expect(migrated.limitMinutes).toBe(30);
  });

  it('executes sequential multi-step migrations (v1 -> v2 -> v3)', async () => {
    const step1 = migrationV1ToV2;
    const step2: Migration = {
      fromVersion: 2,
      toVersion: 3,
      migrate(data: unknown) {
        const item = data as Record<string, unknown>;
        return {
          ...item,
          priority: 'standard',
          schemaVersion: 3,
        };
      },
    };

    const runner = new MigrationRunner([step1, step2]);

    const v1Data = {
      id: 'rule-multi',
      messages: ['Stay calm'],
      limitMinutes: 15,
      delaySeconds: 5,
      blockMinutes: 20,
      appIds: ['com.app.multi'],
      enabled: true,
      schemaVersion: 1,
    };

    const migrated = await runner.run<Record<string, unknown>>(v1Data, 3);

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.tags).toEqual([]);
    expect(migrated.priority).toBe('standard');
  });
});
