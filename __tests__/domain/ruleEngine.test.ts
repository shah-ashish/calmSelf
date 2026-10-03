import type { Rule, AppState } from '@/domain/types';
import {
  evaluateEnforcement,
  normalizeAppStateForDate,
  recordUsageTick,
  createInitialAppState,
} from '@/domain/ruleEngine';
import { MockClock } from '@/domain/time';

describe('Domain: RuleEngine', () => {
  let clock: MockClock;
  let testRule: Rule;

  beforeEach(() => {
    // Start at 2026-10-03 10:00:00 local time
    clock = new MockClock(new Date(2026, 9, 3, 10, 0, 0).getTime());

    testRule = {
      id: 'rule-social',
      messages: ['Focus on your goals!', 'Is this serving you?'],
      limitMinutes: 30, // 1800 seconds
      delaySeconds: 10,
      blockMinutes: 60, // 3600 seconds
      appIds: ['com.instagram.android', 'com.google.android.youtube'],
      enabled: true,
      schemaVersion: 1,
    };
  });

  describe('evaluateEnforcement()', () => {
    it('returns allow when rule is disabled', () => {
      const disabledRule = { ...testRule, enabled: false };
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 2000, // over limit, but rule disabled
        usageDate: clock.todayDateString(),
      };

      const decision = evaluateEnforcement(disabledRule, state, clock.now());
      expect(decision).toEqual({ type: 'allow' });
    });

    it('returns show_message with delay when under daily limit', () => {
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 600, // 10 min out of 30 min limit
        usageDate: clock.todayDateString(),
      };

      const decision = evaluateEnforcement(testRule, state, clock.now(), {
        randomSelector: () => 0,
      });

      expect(decision).toEqual({
        type: 'show_message',
        message: 'Focus on your goals!',
        delaySeconds: 10,
      });
    });

    it('selects message using random selector', () => {
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 100,
        usageDate: clock.todayDateString(),
      };

      const decision = evaluateEnforcement(testRule, state, clock.now(), {
        randomSelector: () => 1,
      });

      expect(decision).toEqual({
        type: 'show_message',
        message: 'Is this serving you?',
        delaySeconds: 10,
      });
    });

    it('returns lock when exactly at daily limit', () => {
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 30 * 60, // Exactly 1800s (30m)
        usageDate: clock.todayDateString(),
      };

      const now = clock.now();
      const decision = evaluateEnforcement(testRule, state, now);

      expect(decision).toEqual({
        type: 'lock',
        lockedUntil: now + 60 * 60 * 1000, // Now + 60 min
      });
    });

    it('returns lock when over daily limit', () => {
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 35 * 60, // 35m (over 30m limit)
        usageDate: clock.todayDateString(),
      };

      const now = clock.now();
      const decision = evaluateEnforcement(testRule, state, now);

      expect(decision).toEqual({
        type: 'lock',
        lockedUntil: now + 60 * 60 * 1000,
      });
    });

    it('returns lock when lock is actively in effect (under limit or locked)', () => {
      const lockExpiration = clock.now() + 20 * 60 * 1000; // 20m in the future
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 30 * 60,
        usageDate: clock.todayDateString(),
        lockedUntil: lockExpiration,
      };

      const decision = evaluateEnforcement(testRule, state, clock.now());

      expect(decision).toEqual({
        type: 'lock',
        lockedUntil: lockExpiration,
      });
    });

    it('clears expired lock and re-evaluates when lock has expired', () => {
      const pastLock = clock.now() - 5 * 60 * 1000; // 5 min ago

      // Case: lock expired on a new calendar day
      clock.advanceDays(1);
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 1800,
        usageDate: '2026-10-03', // Yesterday
        lockedUntil: pastLock,
      };

      const decision = evaluateEnforcement(testRule, state, clock.now(), {
        randomSelector: () => 0,
      });

      // On new day, usage reset to 0, so show message
      expect(decision).toEqual({
        type: 'show_message',
        message: 'Focus on your goals!',
        delaySeconds: 10,
      });
    });

    it('enforces independent state: Instagram at limit does NOT affect YouTube', () => {
      // Instagram used 30 min (at limit)
      const instagramState: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 1800,
        usageDate: clock.todayDateString(),
      };

      // YouTube used only 5 min (under limit)
      const youtubeState: AppState = {
        appId: 'com.google.android.youtube',
        ruleId: testRule.id,
        usedTodaySeconds: 300,
        usageDate: clock.todayDateString(),
      };

      const now = clock.now();
      const instagramDecision = evaluateEnforcement(testRule, instagramState, now);
      const youtubeDecision = evaluateEnforcement(testRule, youtubeState, now, {
        randomSelector: () => 0,
      });

      // Instagram is locked
      expect(instagramDecision).toEqual({
        type: 'lock',
        lockedUntil: now + 60 * 60 * 1000,
      });

      // YouTube is NOT locked and shows message
      expect(youtubeDecision).toEqual({
        type: 'show_message',
        message: 'Focus on your goals!',
        delaySeconds: 10,
      });
    });
  });

  describe('midnight rollover', () => {
    it('automatically resets usage counter on a new calendar day', () => {
      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 1500,
        usageDate: clock.todayDateString(),
      };

      // Same day: usage maintained
      const sameDayNormalized = normalizeAppStateForDate(state, clock.now());
      expect(sameDayNormalized.usedTodaySeconds).toBe(1500);

      // Advance clock past midnight to tomorrow
      clock.advanceDays(1);
      const nextDayNormalized = normalizeAppStateForDate(state, clock.now());

      expect(nextDayNormalized.usedTodaySeconds).toBe(0);
      expect(nextDayNormalized.usageDate).toBe(clock.todayDateString());
    });

    it('preserves an active lock spanning midnight until its expiration time', () => {
      // Set time to 22:00:00 (10 PM)
      const lateEvening = new Date(2026, 9, 3, 22, 0, 0).getTime();
      clock.setTime(lateEvening);

      const lockUntil = lateEvening + 4 * 60 * 60 * 1000; // Locked for 4 hours (until 02:00 next day)

      const state: AppState = {
        appId: 'com.instagram.android',
        ruleId: testRule.id,
        usedTodaySeconds: 1800,
        usageDate: clock.todayDateString(),
        lockedUntil: lockUntil,
      };

      // Advance 3 hours across midnight to 01:00 next morning
      clock.advanceHours(3);

      const normalized = normalizeAppStateForDate(state, clock.now());
      expect(normalized.usedTodaySeconds).toBe(0); // Counter reset for new day
      expect(normalized.lockedUntil).toBe(lockUntil); // Lock still active
    });
  });

  describe('recordUsageTick() & createInitialAppState()', () => {
    it('records elapsed seconds accurately', () => {
      const state = createInitialAppState('com.instagram.android', testRule.id, clock.now());
      expect(state.usedTodaySeconds).toBe(0);

      const tick1 = recordUsageTick(state, 15, clock.now());
      expect(tick1.usedTodaySeconds).toBe(15);

      const tick2 = recordUsageTick(tick1, 45, clock.now());
      expect(tick2.usedTodaySeconds).toBe(60);
    });

    it('ignores non-positive elapsed seconds', () => {
      const state = createInitialAppState('com.instagram.android', testRule.id, clock.now());
      const updated = recordUsageTick(state, 0, clock.now());
      expect(updated.usedTodaySeconds).toBe(0);
    });
  });
});
