import { AppStateRepository } from '@/data/repositories/AppStateRepository';
import { InMemoryStorageAdapter } from '@/data/storage/InMemoryStorageAdapter';
import type { AppState } from '@/domain/types';
import { STORAGE } from '@/config/constants';

describe('AppStateRepository (Per-App Usage, Locks, Rollover, Resilience)', () => {
  let storage: InMemoryStorageAdapter;
  let repo: AppStateRepository;

  const stateInstagram: AppState = {
    appId: 'com.instagram.android',
    ruleId: 'rule-social',
    usedTodaySeconds: 600,
    usageDate: '2026-10-03',
  };

  const stateYoutube: AppState = {
    appId: 'com.google.android.youtube',
    ruleId: 'rule-social',
    usedTodaySeconds: 1800,
    usageDate: '2026-10-03',
    lockedUntil: 1791000000000,
  };

  const stateReddit: AppState = {
    appId: 'com.reddit.frontpage',
    ruleId: 'rule-entertainment',
    usedTodaySeconds: 300,
    usageDate: '2026-10-03',
  };

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    repo = new AppStateRepository(storage);
  });

  describe('CRUD & Queries', () => {
    it('returns empty list when storage is clean', async () => {
      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('saves and retrieves per-app state by appId', async () => {
      await repo.save(stateInstagram);

      const found = await repo.getByAppId('com.instagram.android');
      expect(found.ok).toBe(true);
      if (found.ok) {
        expect(found.value).toEqual(stateInstagram);
      }

      const notFound = await repo.getByAppId('com.unknown.app');
      expect(notFound.ok).toBe(true);
      if (notFound.ok) {
        expect(notFound.value).toBeNull();
      }
    });

    it('queries states by ruleId', async () => {
      await repo.saveMany([stateInstagram, stateYoutube, stateReddit]);

      const matching = await repo.getByRuleId('rule-social');
      expect(matching.ok).toBe(true);
      if (matching.ok) {
        expect(matching.value.length).toBe(2);
        expect(matching.value.map((s) => s.appId)).toEqual(
          expect.arrayContaining(['com.instagram.android', 'com.google.android.youtube'])
        );
      }
    });

    it('updates existing app state in place', async () => {
      await repo.save(stateInstagram);

      const updatedInstagram: AppState = {
        ...stateInstagram,
        usedTodaySeconds: 950,
      };

      await repo.save(updatedInstagram);

      const found = await repo.getByAppId('com.instagram.android');
      expect(found.ok).toBe(true);
      if (found.ok) {
        expect(found.value?.usedTodaySeconds).toBe(950);
      }
    });

    it('deletes by appId', async () => {
      await repo.saveMany([stateInstagram, stateYoutube]);

      const delRes = await repo.deleteByAppId('com.instagram.android');
      expect(delRes.ok).toBe(true);

      const all = await repo.getAll();
      expect(all.ok).toBe(true);
      if (all.ok) {
        expect(all.value.length).toBe(1);
        expect(all.value[0].appId).toBe('com.google.android.youtube');
      }
    });

    it('deletes all states associated with a ruleId', async () => {
      await repo.saveMany([stateInstagram, stateYoutube, stateReddit]);

      const delRes = await repo.deleteByRuleId('rule-social');
      expect(delRes.ok).toBe(true);

      const all = await repo.getAll();
      expect(all.ok).toBe(true);
      if (all.ok) {
        expect(all.value.length).toBe(1);
        expect(all.value[0].appId).toBe('com.reddit.frontpage');
      }
    });

    it('clears all app states', async () => {
      await repo.saveMany([stateInstagram, stateYoutube]);
      await repo.clear();

      const all = await repo.getAll();
      expect(all.ok).toBe(true);
      if (all.ok) {
        expect(all.value).toEqual([]);
      }
    });
  });

  describe('Midnight Rollover Date Reset', () => {
    it('resets usedTodaySeconds to 0 for past date but preserves same-day records', async () => {
      const pastState: AppState = {
        appId: 'com.past.app',
        ruleId: 'rule-past',
        usedTodaySeconds: 1500,
        usageDate: '2026-10-02',
      };

      const todayState: AppState = {
        appId: 'com.today.app',
        ruleId: 'rule-today',
        usedTodaySeconds: 500,
        usageDate: '2026-10-03',
      };

      await repo.saveMany([pastState, todayState]);

      // Rollover to 2026-10-03
      await repo.resetForDate('2026-10-03');

      const pastApp = await repo.getByAppId('com.past.app');
      expect(pastApp.ok).toBe(true);
      if (pastApp.ok) {
        expect(pastApp.value?.usedTodaySeconds).toBe(0);
        expect(pastApp.value?.usageDate).toBe('2026-10-03');
      }

      const todayApp = await repo.getByAppId('com.today.app');
      expect(todayApp.ok).toBe(true);
      if (todayApp.ok) {
        expect(todayApp.value?.usedTodaySeconds).toBe(500); // Unchanged
        expect(todayApp.value?.usageDate).toBe('2026-10-03');
      }
    });
  });

  describe('Corrupted & Missing Record Handling', () => {
    it('handles corrupted JSON safely', async () => {
      await storage.setItem(STORAGE.APP_STATE_STORAGE_KEY, 'invalid json syntax');

      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('handles non-array storage content safely', async () => {
      await storage.setItem(STORAGE.APP_STATE_STORAGE_KEY, '{"error": true}');

      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('skips corrupted records in array and preserves valid ones', async () => {
      const badRecords = [
        stateInstagram,
        { appId: '', ruleId: 'x' }, // Missing required fields
        null,
        'unexpected string',
        { ...stateYoutube, usedTodaySeconds: 'not a number' },
      ];

      await storage.setItem(STORAGE.APP_STATE_STORAGE_KEY, JSON.stringify(badRecords));

      const res = await repo.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.length).toBe(1);
        expect(res.value[0].appId).toBe('com.instagram.android');
      }
    });

    it('rejects invalid state on save', async () => {
      const invalid = {
        appId: '',
        ruleId: 'r1',
        usedTodaySeconds: 10,
        usageDate: '2026-10-03',
      } as unknown as AppState;

      const saveRes = await repo.save(invalid);
      expect(saveRes.ok).toBe(false);
    });
  });

  describe('Storage Adapter Error Resilience', () => {
    it('returns err when storage.getItem throws on getAll', async () => {
      jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Storage read failure'));
      const res = await repo.getAll();
      expect(res.ok).toBe(false);
    });

    it('returns err when storage.setItem throws on saveMany', async () => {
      jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Storage write failure'));
      const res = await repo.saveMany([stateInstagram]);
      expect(res.ok).toBe(false);
    });

    it('returns err when storage throws on deleteByAppId', async () => {
      jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
      const res = await repo.deleteByAppId('com.instagram.android');
      expect(res.ok).toBe(false);
    });

    it('returns err when storage throws on deleteByRuleId', async () => {
      jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
      const res = await repo.deleteByRuleId('rule-social');
      expect(res.ok).toBe(false);
    });

    it('returns err when storage throws on resetForDate', async () => {
      jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
      const res = await repo.resetForDate('2026-10-04');
      expect(res.ok).toBe(false);
    });

    it('returns err when storage throws on clear', async () => {
      jest.spyOn(storage, 'removeItem').mockRejectedValueOnce(new Error('Storage error'));
      const res = await repo.clear();
      expect(res.ok).toBe(false);
    });
  });
});

