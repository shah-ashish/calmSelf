import type { Rule } from '@/domain/types';
import {
  applyChangePolicy,
  undoPendingChange,
  applyDuePendingChanges,
  classifyLimitChange,
  classifyDelayChange,
  classifyBlockDurationChange,
  classifyEnabledChange,
  classifyAppListChanges,
} from '@/domain/changePolicy';
import { MockClock } from '@/domain/time';

describe('Domain: Asymmetric ChangePolicy', () => {
  let clock: MockClock;
  let baseRule: Rule;
  let midnightMs: number;

  beforeEach(() => {
    // Current time: 2026-10-03 14:00:00 local time
    clock = new MockClock(new Date(2026, 9, 3, 14, 0, 0).getTime());
    midnightMs = clock.nextLocalMidnight();

    baseRule = {
      id: 'rule-1',
      messages: ['Be present.'],
      limitMinutes: 30,
      delaySeconds: 10,
      blockMinutes: 60,
      appIds: ['com.instagram.android'],
      enabled: true,
      schemaVersion: 1,
    };
  });

  describe('Classification functions', () => {
    it('classifies limit changes correctly (lower = tightening, higher = loosening)', () => {
      expect(classifyLimitChange(30, 20)).toBe('tightening');
      expect(classifyLimitChange(30, 45)).toBe('loosening');
      expect(classifyLimitChange(30, 30)).toBe('neutral');
    });

    it('classifies delay changes correctly (longer = tightening, shorter = loosening)', () => {
      expect(classifyDelayChange(10, 15)).toBe('tightening');
      expect(classifyDelayChange(10, 5)).toBe('loosening');
      expect(classifyDelayChange(10, 10)).toBe('neutral');
    });

    it('classifies block duration correctly (longer = tightening, shorter = loosening)', () => {
      expect(classifyBlockDurationChange(60, 120)).toBe('tightening');
      expect(classifyBlockDurationChange(60, 30)).toBe('loosening');
      expect(classifyBlockDurationChange(60, 60)).toBe('neutral');
    });

    it('classifies enabled changes correctly (ON = tightening, OFF = loosening)', () => {
      expect(classifyEnabledChange(false, true)).toBe('tightening');
      expect(classifyEnabledChange(true, false)).toBe('loosening');
      expect(classifyEnabledChange(true, true)).toBe('neutral');
    });

    it('classifies app list changes (added = tightening, removed = loosening)', () => {
      const { added, removed } = classifyAppListChanges(
        ['com.instagram.android'],
        ['com.instagram.android', 'com.google.android.youtube']
      );
      expect(added).toEqual(['com.google.android.youtube']);
      expect(removed).toEqual([]);

      const removal = classifyAppListChanges(
        ['com.instagram.android', 'com.google.android.youtube'],
        ['com.instagram.android']
      );
      expect(removal.added).toEqual([]);
      expect(removal.removed).toEqual(['com.google.android.youtube']);
    });
  });

  describe('Tightening Cases (Apply Immediately)', () => {
    it('1. Lower daily limit applies immediately', () => {
      const result = applyChangePolicy(baseRule, { limitMinutes: 20 }, midnightMs);

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(false);
      expect(result.updatedRule.limitMinutes).toBe(20);
      expect(result.updatedRule.pendingChange).toBeUndefined();
    });

    it('2. Longer delay applies immediately', () => {
      const result = applyChangePolicy(baseRule, { delaySeconds: 20 }, midnightMs);

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(false);
      expect(result.updatedRule.delaySeconds).toBe(20);
      expect(result.updatedRule.pendingChange).toBeUndefined();
    });

    it('3. Longer block duration applies immediately', () => {
      const result = applyChangePolicy(baseRule, { blockMinutes: 120 }, midnightMs);

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(false);
      expect(result.updatedRule.blockMinutes).toBe(120);
      expect(result.updatedRule.pendingChange).toBeUndefined();
    });

    it('4. Adding an app applies immediately', () => {
      const result = applyChangePolicy(
        baseRule,
        { appIds: ['com.instagram.android', 'com.reddit.frontpage'] },
        midnightMs
      );

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(false);
      expect(result.updatedRule.appIds).toEqual([
        'com.instagram.android',
        'com.reddit.frontpage',
      ]);
      expect(result.updatedRule.pendingChange).toBeUndefined();
    });

    it('5. Turning rule ON applies immediately', () => {
      const disabledRule = { ...baseRule, enabled: false };
      const result = applyChangePolicy(disabledRule, { enabled: true }, midnightMs);

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(false);
      expect(result.updatedRule.enabled).toBe(true);
      expect(result.updatedRule.pendingChange).toBeUndefined();
    });
  });

  describe('Loosening Cases (Apply at Next Midnight)', () => {
    it('1. Higher daily limit becomes pending', () => {
      const result = applyChangePolicy(baseRule, { limitMinutes: 45 }, midnightMs);

      expect(result.hasTightening).toBe(false);
      expect(result.hasLoosening).toBe(true);
      // Active rule unchanged now
      expect(result.updatedRule.limitMinutes).toBe(30);
      // Pending until midnight
      expect(result.updatedRule.pendingChange).toEqual({
        patch: { limitMinutes: 45 },
        effectiveAt: midnightMs,
      });
    });

    it('2. Shorter delay becomes pending', () => {
      const result = applyChangePolicy(baseRule, { delaySeconds: 5 }, midnightMs);

      expect(result.hasTightening).toBe(false);
      expect(result.hasLoosening).toBe(true);
      expect(result.updatedRule.delaySeconds).toBe(10);
      expect(result.updatedRule.pendingChange).toEqual({
        patch: { delaySeconds: 5 },
        effectiveAt: midnightMs,
      });
    });

    it('3. Shorter block duration becomes pending', () => {
      const result = applyChangePolicy(baseRule, { blockMinutes: 15 }, midnightMs);

      expect(result.hasTightening).toBe(false);
      expect(result.hasLoosening).toBe(true);
      expect(result.updatedRule.blockMinutes).toBe(60);
      expect(result.updatedRule.pendingChange).toEqual({
        patch: { blockMinutes: 15 },
        effectiveAt: midnightMs,
      });
    });

    it('4. Removing an app becomes pending', () => {
      const multiAppRule = {
        ...baseRule,
        appIds: ['com.instagram.android', 'com.google.android.youtube'],
      };

      const result = applyChangePolicy(
        multiAppRule,
        { appIds: ['com.instagram.android'] }, // removed YouTube
        midnightMs
      );

      expect(result.hasTightening).toBe(false);
      expect(result.hasLoosening).toBe(true);
      // Still protected today
      expect(result.updatedRule.appIds).toEqual([
        'com.instagram.android',
        'com.google.android.youtube',
      ]);
      expect(result.updatedRule.pendingChange).toEqual({
        patch: { appIds: ['com.instagram.android'] },
        effectiveAt: midnightMs,
      });
    });

    it('5. Turning rule OFF becomes pending', () => {
      const result = applyChangePolicy(baseRule, { enabled: false }, midnightMs);

      expect(result.hasTightening).toBe(false);
      expect(result.hasLoosening).toBe(true);
      expect(result.updatedRule.enabled).toBe(true); // Still enabled today
      expect(result.updatedRule.pendingChange).toEqual({
        patch: { enabled: false },
        effectiveAt: midnightMs,
      });
    });
  });

  describe('Mixed Edits (Split Correctly)', () => {
    it('splits tightening and loosening edits in a single change', () => {
      // User lowers limit from 30 to 15 (tightening) AND shortens delay from 10 to 5 (loosening)
      const result = applyChangePolicy(
        baseRule,
        {
          limitMinutes: 15,
          delaySeconds: 5,
        },
        midnightMs
      );

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(true);

      // Tightening applied immediately:
      expect(result.updatedRule.limitMinutes).toBe(15);
      // Delay kept at 10 for now:
      expect(result.updatedRule.delaySeconds).toBe(10);
      // Loosening pending for midnight:
      expect(result.updatedRule.pendingChange).toEqual({
        patch: { delaySeconds: 5 },
        effectiveAt: midnightMs,
      });
    });

    it('splits mixed app list modifications (adds now, removals pending)', () => {
      const rule: Rule = {
        ...baseRule,
        appIds: ['com.instagram.android', 'com.twitter.android'],
      };

      // User adds Reddit AND removes Twitter
      const result = applyChangePolicy(
        rule,
        {
          appIds: ['com.instagram.android', 'com.reddit.frontpage'],
        },
        midnightMs
      );

      expect(result.hasTightening).toBe(true);
      expect(result.hasLoosening).toBe(true);

      // Immediate rule includes Instagram, Twitter (not removed yet), AND Reddit (added immediately!)
      expect(result.updatedRule.appIds).toContain('com.reddit.frontpage');
      expect(result.updatedRule.appIds).toContain('com.twitter.android');

      // Pending patch has desired final list (Twitter removed)
      expect(result.updatedRule.pendingChange?.patch.appIds).toEqual([
        'com.instagram.android',
        'com.reddit.frontpage',
      ]);
    });
  });

  describe('Undo & Due Pending Change Execution', () => {
    it('undoPendingChange removes pending loosening without reverting immediate changes', () => {
      const splitResult = applyChangePolicy(
        baseRule,
        { limitMinutes: 15, delaySeconds: 3 },
        midnightMs
      );

      expect(splitResult.updatedRule.pendingChange).toBeDefined();

      const undone = undoPendingChange(splitResult.updatedRule);
      expect(undone.pendingChange).toBeUndefined();
      // Immediate tightening preserved
      expect(undone.limitMinutes).toBe(15);
      // Delay remains 10
      expect(undone.delaySeconds).toBe(10);
    });

    it('does not apply pending changes before effectiveAt', () => {
      const splitResult = applyChangePolicy(baseRule, { limitMinutes: 60 }, midnightMs);

      // Current time is before midnight
      const evaluated = applyDuePendingChanges(splitResult.updatedRule, clock.now());
      expect(evaluated.limitMinutes).toBe(30);
      expect(evaluated.pendingChange).toBeDefined();
    });

    it('applies pending changes when now >= effectiveAt (midnight)', () => {
      const splitResult = applyChangePolicy(
        baseRule,
        { limitMinutes: 60, delaySeconds: 2, enabled: false },
        midnightMs
      );

      // Advance clock past midnight
      clock.advanceHours(12);

      const applied = applyDuePendingChanges(splitResult.updatedRule, clock.now());

      expect(applied.limitMinutes).toBe(60);
      expect(applied.delaySeconds).toBe(2);
      expect(applied.enabled).toBe(false);
      expect(applied.pendingChange).toBeUndefined();
    });
  });
});
