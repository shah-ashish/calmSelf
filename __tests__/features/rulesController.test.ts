import { RulesController } from '@/features/rules/RulesController';
import { RuleRepository } from '@/data/repositories/RuleRepository';
import { AppStateRepository } from '@/data/repositories/AppStateRepository';
import { InMemoryStorageAdapter } from '@/data/storage/InMemoryStorageAdapter';
import { MockClock } from '@/domain/time';
import type { Rule } from '@/domain/types';

describe('RulesController (Home Screen State, Asymmetric Toggling, Rollover)', () => {
  let storage: InMemoryStorageAdapter;
  let ruleRepo: RuleRepository;
  let appStateRepo: AppStateRepository;
  let clock: MockClock;
  let controller: RulesController;

  const baseRule: Rule = {
    id: 'rule-instagram',
    messages: ['Take a mindful breath', 'Is this worth your time?'],
    limitMinutes: 30,
    delaySeconds: 10,
    blockMinutes: 60,
    appIds: ['com.instagram.android'],
    enabled: true,
    schemaVersion: 1,
  };

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    ruleRepo = new RuleRepository(storage);
    appStateRepo = new AppStateRepository(storage);
    clock = new MockClock(new Date('2026-10-03T10:00:00.000Z').getTime());
    controller = new RulesController(ruleRepo, appStateRepo, clock);
  });

  it('starts with empty initial state', () => {
    const state = controller.getState();
    expect(state.rules).toEqual([]);
    expect(state.appStates).toEqual({});
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loads rules and app states and notifies subscribers', async () => {
    await ruleRepo.save(baseRule);
    await appStateRepo.save({
      appId: 'com.instagram.android',
      ruleId: 'rule-instagram',
      usedTodaySeconds: 600,
      usageDate: clock.todayDateString(),
    });

    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    const state = await controller.load();
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0].id).toBe('rule-instagram');
    expect(state.appStates['com.instagram.android']).toBeDefined();
    expect(state.appStates['com.instagram.android'].usedTodaySeconds).toBe(600);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('performs automatic midnight rollover for stale app states on load', async () => {
    const yesterdayDate = '2026-10-02';
    await ruleRepo.save(baseRule);
    await appStateRepo.save({
      appId: 'com.instagram.android',
      ruleId: 'rule-instagram',
      usedTodaySeconds: 1800,
      usageDate: yesterdayDate,
    });

    const state = await controller.load();
    const appState = state.appStates['com.instagram.android'];

    expect(appState).toBeDefined();
    // Daily usage should be reset to 0 for today
    expect(appState.usedTodaySeconds).toBe(0);
    expect(appState.usageDate).toBe(clock.todayDateString());
  });

  it('preserves active lock across midnight rollover on load', async () => {
    const yesterdayDate = '2026-10-02';
    const futureLockTime = clock.now() + 1000 * 60 * 30; // locked for 30 more minutes

    await ruleRepo.save(baseRule);
    await appStateRepo.save({
      appId: 'com.instagram.android',
      ruleId: 'rule-instagram',
      usedTodaySeconds: 1800,
      usageDate: yesterdayDate,
      lockedUntil: futureLockTime,
    });

    const state = await controller.load();
    const appState = state.appStates['com.instagram.android'];

    expect(appState.usedTodaySeconds).toBe(0);
    expect(appState.lockedUntil).toBe(futureLockTime);
  });

  it('automatically applies due pending changes on load when past midnight', async () => {
    const pastEffectiveAt = clock.now() - 1000; // effective in the past
    const ruleWithPending: Rule = {
      ...baseRule,
      enabled: true,
      pendingChange: {
        patch: { enabled: false },
        effectiveAt: pastEffectiveAt,
      },
    };

    await ruleRepo.save(ruleWithPending);

    const state = await controller.load();
    const loadedRule = state.rules[0];

    // Change should have been applied
    expect(loadedRule.enabled).toBe(false);
    expect(loadedRule.pendingChange).toBeUndefined();
  });

  it('turning ON a disabled rule applies immediately (Tightening)', async () => {
    const disabledRule: Rule = {
      ...baseRule,
      enabled: false,
    };
    await ruleRepo.save(disabledRule);
    await controller.load();

    const result = await controller.toggleRule(disabledRule.id);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.enabled).toBe(true);
      expect(result.value.pendingChange).toBeUndefined();
    }

    const state = controller.getState();
    expect(state.rules[0].enabled).toBe(true);
  });

  it('turning OFF an enabled rule stages pending change until midnight (Loosening)', async () => {
    await ruleRepo.save(baseRule);
    await controller.load();

    const result = await controller.toggleRule(baseRule.id);
    expect(result.ok).toBe(true);

    if (result.ok) {
      // Still enabled today!
      expect(result.value.enabled).toBe(true);
      // Pending loosening change recorded for next local midnight
      expect(result.value.pendingChange).toBeDefined();
      expect(result.value.pendingChange?.patch.enabled).toBe(false);
      expect(result.value.pendingChange?.effectiveAt).toBe(clock.nextLocalMidnight(clock.now()));
    }

    const state = controller.getState();
    expect(state.rules[0].pendingChange?.patch.enabled).toBe(false);
  });

  it('undoPending reverts pending changes immediately', async () => {
    const ruleWithPending: Rule = {
      ...baseRule,
      pendingChange: {
        patch: { enabled: false },
        effectiveAt: clock.nextLocalMidnight(clock.now()),
      },
    };
    await ruleRepo.save(ruleWithPending);
    await controller.load();

    const undoResult = await controller.undoPending(ruleWithPending.id);
    expect(undoResult.ok).toBe(true);

    if (undoResult.ok) {
      expect(undoResult.value.pendingChange).toBeUndefined();
      expect(undoResult.value.enabled).toBe(true);
    }

    const state = controller.getState();
    expect(state.rules[0].pendingChange).toBeUndefined();
  });

  it('deleteRule removes the rule and associated app states', async () => {
    await ruleRepo.save(baseRule);
    await appStateRepo.save({
      appId: 'com.instagram.android',
      ruleId: baseRule.id,
      usedTodaySeconds: 300,
      usageDate: clock.todayDateString(),
    });
    await controller.load();

    const deleteResult = await controller.deleteRule(baseRule.id);
    expect(deleteResult.ok).toBe(true);

    const state = controller.getState();
    expect(state.rules).toHaveLength(0);
    expect(state.appStates['com.instagram.android']).toBeUndefined();

    // Verify repository is empty
    const remainingRules = await ruleRepo.getAll();
    expect(remainingRules.ok && remainingRules.value).toEqual([]);
  });

  it('handles toggle and undo for non-existent rule gracefully', async () => {
    await controller.load();

    const toggleRes = await controller.toggleRule('ghost-rule');
    expect(toggleRes.ok).toBe(false);

    const undoRes = await controller.undoPending('ghost-rule');
    expect(undoRes.ok).toBe(false);
  });

  describe('createRule, updateRule, getRuleById, getAssignedApps', () => {
    it('getRuleById returns rule if present or undefined', async () => {
      await ruleRepo.save(baseRule);
      await controller.load();

      expect(controller.getRuleById(baseRule.id)).toEqual(baseRule);
      expect(controller.getRuleById('non-existent')).toBeUndefined();
    });

    it('getAssignedApps returns map of packageId to ruleId and supports exclusion', async () => {
      const secondRule: Rule = {
        id: 'rule-youtube',
        messages: ['Mindful youtube'],
        limitMinutes: 45,
        delaySeconds: 5,
        blockMinutes: 30,
        appIds: ['com.google.android.youtube'],
        enabled: true,
        schemaVersion: 1,
      };
      await ruleRepo.save(baseRule);
      await ruleRepo.save(secondRule);
      await controller.load();

      const allAssigned = controller.getAssignedApps();
      expect(allAssigned.get('com.instagram.android')).toBe(baseRule.id);
      expect(allAssigned.get('com.google.android.youtube')).toBe(secondRule.id);

      // Exclude baseRule
      const excludingFirst = controller.getAssignedApps(baseRule.id);
      expect(excludingFirst.has('com.instagram.android')).toBe(false);
      expect(excludingFirst.get('com.google.android.youtube')).toBe(secondRule.id);
    });

    it('createRule fails if validation fails', async () => {
      await controller.load();

      // Empty messages
      const res = await controller.createRule({
        messages: [],
        limitMinutes: 30,
        delaySeconds: 10,
        blockMinutes: 60,
        appIds: ['com.twitter.android'],
      });

      expect(res.ok).toBe(false);
    });

    it('createRule fails if app is already assigned to another rule (Business Rule 1)', async () => {
      await ruleRepo.save(baseRule);
      await controller.load();

      const res = await controller.createRule({
        messages: ['Test message'],
        limitMinutes: 30,
        delaySeconds: 10,
        blockMinutes: 60,
        appIds: ['com.instagram.android'], // Conflict!
      });

      expect(res.ok).toBe(false);
    });

    it('createRule succeeds, saves rule and initializes AppState', async () => {
      await controller.load();

      const res = await controller.createRule({
        messages: ['Take a break'],
        limitMinutes: 20,
        delaySeconds: 15,
        blockMinutes: 30,
        appIds: ['com.twitter.android'],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.id).toBeDefined();
        expect(res.value.messages).toEqual(['Take a break']);
        expect(res.value.limitMinutes).toBe(20);
        expect(res.value.delaySeconds).toBe(15);
        expect(res.value.blockMinutes).toBe(30);
        expect(res.value.appIds).toEqual(['com.twitter.android']);
      }

      const state = controller.getState();
      expect(state.rules).toHaveLength(1);
      expect(state.appStates['com.twitter.android']).toBeDefined();
      expect(state.appStates['com.twitter.android'].usedTodaySeconds).toBe(0);
    });

    it('updateRule fails if rule does not exist', async () => {
      await controller.load();

      const res = await controller.updateRule('non-existent', {
        messages: ['New message'],
        limitMinutes: 30,
        delaySeconds: 10,
        blockMinutes: 60,
        appIds: ['com.twitter.android'],
      });

      expect(res.ok).toBe(false);
    });

    it('updateRule applies tightening changes immediately', async () => {
      await ruleRepo.save(baseRule);
      await controller.load();

      // Tightening: limit 30 -> 15, delay 10 -> 20, block 60 -> 90, added twitter
      const res = await controller.updateRule(baseRule.id, {
        messages: ['Updated prompt'],
        limitMinutes: 15,
        delaySeconds: 20,
        blockMinutes: 90,
        appIds: ['com.instagram.android', 'com.twitter.android'],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.limitMinutes).toBe(15);
        expect(res.value.delaySeconds).toBe(20);
        expect(res.value.blockMinutes).toBe(90);
        expect(res.value.appIds).toEqual(['com.instagram.android', 'com.twitter.android']);
        expect(res.value.pendingChange).toBeUndefined();
      }

      const state = controller.getState();
      expect(state.rules[0].limitMinutes).toBe(15);
      expect(state.appStates['com.twitter.android']).toBeDefined();
    });

    it('updateRule stages loosening changes as pending until next midnight', async () => {
      await ruleRepo.save(baseRule);
      await controller.load();

      // Loosening: limit 30 -> 60, delay 10 -> 0, block 60 -> 15
      const res = await controller.updateRule(baseRule.id, {
        messages: baseRule.messages,
        limitMinutes: 60,
        delaySeconds: 0,
        blockMinutes: 15,
        appIds: baseRule.appIds,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        // Immediate values remain original
        expect(res.value.limitMinutes).toBe(30);
        expect(res.value.delaySeconds).toBe(10);
        expect(res.value.blockMinutes).toBe(60);

        // Pending change contains the relaxed values
        expect(res.value.pendingChange).toBeDefined();
        expect(res.value.pendingChange?.patch.limitMinutes).toBe(60);
        expect(res.value.pendingChange?.patch.delaySeconds).toBe(0);
        expect(res.value.pendingChange?.patch.blockMinutes).toBe(15);
      }
    });
  });
});

