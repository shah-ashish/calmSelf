import { RuleRepository } from '@/data/repositories/RuleRepository';
import { InMemoryStorageAdapter } from '@/data/storage/InMemoryStorageAdapter';
import type { Rule } from '@/domain/types';
import { STORAGE } from '@/config/constants';
import { MigrationRunner } from '@/data/migrations/MigrationRunner';
import { migrationV1ToV2 } from '@/data/migrations/v1_to_v2';

describe('RuleRepository (CRUD, Corrupted Records, Persistence)', () => {
  let storage: InMemoryStorageAdapter;
  let repo: RuleRepository;

  const validRule1: Rule = {
    id: 'rule-instagram',
    messages: ['Take a deep breath and pause.'],
    limitMinutes: 30,
    delaySeconds: 10,
    blockMinutes: 60,
    appIds: ['com.instagram.android'],
    enabled: true,
    schemaVersion: 1,
  };

  const validRule2: Rule = {
    id: 'rule-youtube',
    messages: ['Is this intentional?'],
    limitMinutes: 45,
    delaySeconds: 15,
    blockMinutes: 90,
    appIds: ['com.google.android.youtube'],
    enabled: false,
    schemaVersion: 1,
  };

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    repo = new RuleRepository(storage);
  });

  describe('CRUD Operations', () => {
    it('returns empty list when no rules exist', async () => {
      const result = await repo.getAll();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('creates a new rule and stamps schemaVersion', async () => {
      const saveRes = await repo.save(validRule1);
      expect(saveRes.ok).toBe(true);

      const allRes = await repo.getAll();
      expect(allRes.ok).toBe(true);
      if (allRes.ok) {
        expect(allRes.value.length).toBe(1);
        expect(allRes.value[0].id).toBe('rule-instagram');
        expect(allRes.value[0].schemaVersion).toBe(STORAGE.CURRENT_SCHEMA_VERSION);
      }
    });

    it('retrieves rule by ID', async () => {
      await repo.save(validRule1);
      await repo.save(validRule2);

      const foundRes = await repo.getById('rule-instagram');
      expect(foundRes.ok).toBe(true);
      if (foundRes.ok) {
        expect(foundRes.value?.id).toBe('rule-instagram');
        expect(foundRes.value?.limitMinutes).toBe(30);
      }

      const notFoundRes = await repo.getById('non-existent');
      expect(notFoundRes.ok).toBe(true);
      if (notFoundRes.ok) {
        expect(notFoundRes.value).toBeNull();
      }
    });

    it('updates existing rule in place', async () => {
      await repo.save(validRule1);

      const updatedRule: Rule = {
        ...validRule1,
        limitMinutes: 20,
        delaySeconds: 12,
      };

      const updateRes = await repo.save(updatedRule);
      expect(updateRes.ok).toBe(true);

      const allRes = await repo.getAll();
      expect(allRes.ok).toBe(true);
      if (allRes.ok) {
        expect(allRes.value.length).toBe(1);
        expect(allRes.value[0].limitMinutes).toBe(20);
        expect(allRes.value[0].delaySeconds).toBe(12);
      }
    });

    it('deletes a rule by ID', async () => {
      await repo.save(validRule1);
      await repo.save(validRule2);

      const deleteRes = await repo.delete('rule-instagram');
      expect(deleteRes.ok).toBe(true);

      const allRes = await repo.getAll();
      expect(allRes.ok).toBe(true);
      if (allRes.ok) {
        expect(allRes.value.length).toBe(1);
        expect(allRes.value[0].id).toBe('rule-youtube');
      }
    });

    it('clears all rules', async () => {
      await repo.save(validRule1);
      await repo.save(validRule2);

      const clearRes = await repo.clear();
      expect(clearRes.ok).toBe(true);

      const allRes = await repo.getAll();
      expect(allRes.ok).toBe(true);
      if (allRes.ok) {
        expect(allRes.value).toEqual([]);
      }
    });

    it('rejects invalid rule input per domain bounds', async () => {
      const invalidRule: Rule = {
        ...validRule1,
        limitMinutes: 0, // Invalid: min is 1
      };

      const result = await repo.save(invalidRule);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Rule validation failed');
      }
    });
  });

  describe('Corrupted & Missing Record Handling', () => {
    it('handles missing record in storage without error', async () => {
      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('recovers safely when storage contains completely corrupted JSON', async () => {
      await storage.setItem(STORAGE.RULE_STORAGE_KEY, '{invalid json syntax... [[[;');

      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('recovers safely when storage contains non-array JSON', async () => {
      await storage.setItem(STORAGE.RULE_STORAGE_KEY, JSON.stringify({ not: 'an array' }));

      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('filters out malformed items and preserves valid rules', async () => {
      const mixedData = [
        validRule1,
        { id: '', messages: [] }, // Invalid: empty id
        null,
        12345,
        'corrupt string entry',
        { ...validRule2, limitMinutes: 'not-a-number' }, // Invalid type
      ];

      await storage.setItem(STORAGE.RULE_STORAGE_KEY, JSON.stringify(mixedData));

      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.length).toBe(1);
        expect(res.value[0].id).toBe('rule-instagram');
      }
    });
  });

  describe('App Restart & Persistence Simulation', () => {
    it('data survives an app restart (new repository instance reading same storage)', async () => {
      // 1. Initial app session writes rules
      const session1Repo = new RuleRepository(storage);
      await session1Repo.save(validRule1);
      await session1Repo.save(validRule2);

      // 2. Simulate app termination and reboot: new repo instance created
      const session2Repo = new RuleRepository(storage);
      const rebootResult = await session2Repo.getAll();

      expect(rebootResult.ok).toBe(true);
      if (rebootResult.ok) {
        expect(rebootResult.value.length).toBe(2);
        expect(rebootResult.value.map((r) => r.id)).toEqual(['rule-instagram', 'rule-youtube']);
      }
    });
  });

  describe('Migration Integration', () => {
    it('migrates older schemaVersion data when loaded via repository', async () => {
      const runner = new MigrationRunner([migrationV1ToV2]);
      const migratingRepo = new RuleRepository(storage, runner, STORAGE.RULE_STORAGE_KEY, 2);

      // Store a v1 rule
      const v1Rule = {
        id: 'legacy-rule',
        messages: ['Old pause message'],
        limitMinutes: 20,
        delaySeconds: 5,
        blockMinutes: 30,
        appIds: ['com.twitter.android'],
        enabled: true,
        schemaVersion: 1,
      };

      await storage.setItem(STORAGE.RULE_STORAGE_KEY, JSON.stringify([v1Rule]));

      const loaded = await migratingRepo.getAll();
      expect(loaded.ok).toBe(true);
      if (loaded.ok) {
        expect(loaded.value.length).toBe(1);
        const item = loaded.value[0] as unknown as Record<string, unknown>;
        expect(item.schemaVersion).toBe(2);
        expect(item.tags).toEqual([]);
      }
    });

    it('skips corrupt rule if migration throws an error', async () => {
      const failingRunner = new MigrationRunner([
        {
          fromVersion: 0,
          toVersion: 1,
          migrate: () => {
            throw new Error('Migration failed');
          },
        },
      ]);
      const failingRepo = new RuleRepository(storage, failingRunner);

      const v0Rule = {
        id: 'corrupt-rule',
        messages: ['Pause'],
        limitMinutes: 20,
        delaySeconds: 5,
        blockMinutes: 30,
        appIds: ['com.app'],
        enabled: true,
        schemaVersion: 0,
      };

      await storage.setItem(STORAGE.RULE_STORAGE_KEY, JSON.stringify([v0Rule]));
      const res = await failingRepo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });
  });

  describe('Storage Adapter Error Resilience', () => {
    it('returns err result when storage throws on getItem', async () => {
      jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Disk read error'));
      const res = await repo.getAll();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.message).toContain('Disk read error');
      }
    });

    it('returns err result when storage throws on setItem during save', async () => {
      jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Disk write error'));
      const res = await repo.save(validRule1);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.message).toContain('Disk write error');
      }
    });

    it('returns err result when storage throws during delete', async () => {
      jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Read failure on delete'));
      const res = await repo.delete('rule-instagram');
      expect(res.ok).toBe(false);
    });

    it('returns err result when storage throws during clear', async () => {
      jest.spyOn(storage, 'removeItem').mockRejectedValueOnce(new Error('Clear failure'));
      const res = await repo.clear();
      expect(res.ok).toBe(false);
    });
  });
});

