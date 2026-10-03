import { EnforcementController } from '@/features/enforcement/EnforcementController';
import { RuleRepository } from '@/data/repositories/RuleRepository';
import { AppStateRepository } from '@/data/repositories/AppStateRepository';
import { InMemoryStorageAdapter } from '@/data/storage/InMemoryStorageAdapter';
import { MockBlockerAdapter } from '@/platform/blocker/MockBlockerAdapter';
import { MockClock } from '@/domain/time';
import type { Rule } from '@/domain/types';

describe('EnforcementController', () => {
  let storage: InMemoryStorageAdapter;
  let ruleRepo: RuleRepository;
  let appStateRepo: AppStateRepository;
  let blocker: MockBlockerAdapter;
  let clock: MockClock;
  let controller: EnforcementController;

  const ruleInstagram: Rule = {
    id: 'rule-instagram',
    messages: ['Mindful message 1', 'Mindful message 2'],
    limitMinutes: 30,
    delaySeconds: 10,
    blockMinutes: 60,
    appIds: ['com.instagram.android'],
    enabled: true,
    schemaVersion: 1,
  };

  const ruleYoutube: Rule = {
    id: 'rule-youtube',
    messages: ['YouTube message'],
    limitMinutes: 45,
    delaySeconds: 5,
    blockMinutes: 30,
    appIds: ['com.google.android.youtube'],
    enabled: false, // Disabled!
    schemaVersion: 1,
  };

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    ruleRepo = new RuleRepository(storage);
    appStateRepo = new AppStateRepository(storage);
    blocker = new MockBlockerAdapter();
    clock = new MockClock(new Date('2026-10-04T10:00:00.000Z').getTime());
    controller = new EnforcementController(ruleRepo, appStateRepo, blocker, clock);
  });

  describe('syncRulesToBlocker', () => {
    it('synchronizes enabled rules to blocker and starts service when permissions granted', async () => {
      await ruleRepo.save(ruleInstagram);
      await ruleRepo.save(ruleYoutube);
      blocker.setAllPermissions(true);

      const state = await controller.syncRulesToBlocker();

      // Only enabled rules' appIds are synced
      expect(blocker.blockedPackages).toEqual(['com.instagram.android']);
      expect(state.blockedPackages).toEqual(['com.instagram.android']);
      expect(blocker.serviceRunning).toBe(true);
      expect(state.monitoringActive).toBe(true);
      expect(blocker.configuredOverlay.title).toBe('Mindful Pause');
    });

    it('stops service if permissions are missing', async () => {
      await ruleRepo.save(ruleInstagram);
      blocker.setAllPermissions(false); // Permissions denied!

      const state = await controller.syncRulesToBlocker();

      expect(blocker.blockedPackages).toEqual(['com.instagram.android']);
      expect(blocker.serviceRunning).toBe(false);
      expect(state.monitoringActive).toBe(false);
    });

    it('stops service if there are no active blocked packages', async () => {
      blocker.setAllPermissions(true);

      const state = await controller.syncRulesToBlocker();

      expect(blocker.blockedPackages).toEqual([]);
      expect(blocker.serviceRunning).toBe(false);
      expect(state.monitoringActive).toBe(false);
    });

    it('automatically triggers sync when rulesController notifies subscribers', async () => {
      const mockRulesController = {
        subscribe: jest.fn((cb: () => void) => {
          // Simulate state notification
          cb();
          return () => {};
        }),
      };

      const syncSpy = jest.spyOn(EnforcementController.prototype, 'syncRulesToBlocker');
      new EnforcementController(ruleRepo, appStateRepo, blocker, clock, mockRulesController);

      expect(mockRulesController.subscribe).toHaveBeenCalled();
      expect(syncSpy).toHaveBeenCalled();
      syncSpy.mockRestore();
    });
  });

  describe('evaluateAppOpen', () => {
    it('returns allow decision if package has no matching rule', async () => {
      const result = await controller.evaluateAppOpen('com.unprotected.app');
      expect(result.decision.type).toBe('allow');
      expect(result.packageName).toBe('com.unprotected.app');
    });

    it('returns allow decision if matching rule is disabled', async () => {
      await ruleRepo.save(ruleYoutube);
      const result = await controller.evaluateAppOpen('com.google.android.youtube');
      expect(result.decision.type).toBe('allow');
    });

    it('returns show_message decision when under daily limit', async () => {
      await ruleRepo.save(ruleInstagram);
      const result = await controller.evaluateAppOpen('com.instagram.android', () => 0);

      expect(result.decision.type).toBe('show_message');
      if (result.decision.type === 'show_message') {
        expect(result.decision.message).toBe('Mindful message 1');
        expect(result.decision.delaySeconds).toBe(10);
      }
      expect(result.appName).toBe('Instagram');
      expect(result.rule?.id).toBe(ruleInstagram.id);
      expect(result.appState).toBeDefined();
    });

    it('returns lock decision when usage limit is reached and persists lockedUntil', async () => {
      await ruleRepo.save(ruleInstagram);
      // Limit is 30m = 1800s. Set usedTodaySeconds = 1800s
      await appStateRepo.save({
        appId: 'com.instagram.android',
        ruleId: ruleInstagram.id,
        usedTodaySeconds: 1800,
        usageDate: clock.todayDateString(),
      });

      const result = await controller.evaluateAppOpen('com.instagram.android');
      expect(result.decision.type).toBe('lock');
      if (result.decision.type === 'lock') {
        // blockMinutes is 60m = 3600000ms
        const expectedLockUntil = clock.now() + 60 * 60 * 1000;
        expect(result.decision.lockedUntil).toBe(expectedLockUntil);
      }

      // Verify app state in repository was persisted with lockedUntil
      const persistedState = await appStateRepo.getByAppId('com.instagram.android');
      expect(persistedState.ok && persistedState.value?.lockedUntil).toBeDefined();
    });
  });

  describe('recordAppUsage', () => {
    it('records usage and automatically triggers lock when daily limit is exhausted', async () => {
      await ruleRepo.save(ruleInstagram);
      await appStateRepo.save({
        appId: 'com.instagram.android',
        ruleId: ruleInstagram.id,
        usedTodaySeconds: 1700, // 100s remaining before 1800s limit
        usageDate: clock.todayDateString(),
      });

      // Record 120 seconds of usage (exceeds limit!)
      const updated = await controller.recordAppUsage('com.instagram.android', 120);

      expect(updated).not.toBeNull();
      expect(updated?.usedTodaySeconds).toBe(1820);
      expect(updated?.lockedUntil).toBeDefined();
      expect(updated?.lockedUntil).toBe(clock.now() + 60 * 60 * 1000);
    });

    it('returns null if package has no assigned rule or app state', async () => {
      const res = await controller.recordAppUsage('com.nonexistent.app', 60);
      expect(res).toBeNull();
    });
  });

  describe('drainIntercepts', () => {
    it('drains intercept events from blocker and increments total counter', async () => {
      blocker.queueIntercept({
        appName: 'Instagram',
        interceptedAt: clock.now(),
      });
      blocker.queueIntercept({
        appName: 'YouTube',
        interceptedAt: clock.now(),
      });

      const count = await controller.drainIntercepts();
      expect(count).toBe(2);

      const state = controller.getState();
      expect(state.totalIntercepts).toBe(2);

      // Subsequent drain is empty
      const secondCount = await controller.drainIntercepts();
      expect(secondCount).toBe(0);
    });
  });
});
