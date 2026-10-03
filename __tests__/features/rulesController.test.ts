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
});
