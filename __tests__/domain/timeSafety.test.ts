import { safeElapsedSeconds, isPast, isFuture } from '@/domain/time';

describe('Domain: Time Safety & Comparisons', () => {
  const referenceMs = 1760000000000; // arbitrary reference epoch ms

  describe('safeElapsedSeconds()', () => {
    it('computes exact elapsed whole seconds for normal forward intervals', () => {
      const startMs = referenceMs;
      const endMs = referenceMs + 45000; // 45 seconds later
      expect(safeElapsedSeconds(startMs, endMs)).toBe(45);
    });

    it('discards sub-second fractions using Math.floor', () => {
      const startMs = referenceMs;
      const endMs = referenceMs + 12900; // 12.9 seconds
      expect(safeElapsedSeconds(startMs, endMs)).toBe(12);
    });

    it('returns 0 when current time is identical to previous time', () => {
      expect(safeElapsedSeconds(referenceMs, referenceMs)).toBe(0);
    });

    it('clamps negative intervals to 0 when clock drifts backwards or is manually tampered', () => {
      const startMs = referenceMs;
      const backwardsMs = referenceMs - 3600000; // 1 hour in the past
      expect(safeElapsedSeconds(startMs, backwardsMs)).toBe(0);
    });

    it('caps excessively large intervals to default maxAllowedSeconds (86,400s / 24h)', () => {
      const startMs = referenceMs;
      const hugeGapMs = referenceMs + 7 * 24 * 3600 * 1000; // 7 days later
      expect(safeElapsedSeconds(startMs, hugeGapMs)).toBe(86400);
    });

    it('respects custom maxAllowedSeconds parameter', () => {
      const startMs = referenceMs;
      const gapMs = referenceMs + 3600 * 1000; // 1 hour (3600s)
      expect(safeElapsedSeconds(startMs, gapMs, 600)).toBe(600); // capped at 10 min
      expect(safeElapsedSeconds(startMs, gapMs, 7200)).toBe(3600); // uncapped
    });
  });

  describe('isPast()', () => {
    it('returns true when target is in the past', () => {
      expect(isPast(referenceMs - 1000, referenceMs)).toBe(true);
    });

    it('returns true when target is exactly equal to reference time', () => {
      expect(isPast(referenceMs, referenceMs)).toBe(true);
    });

    it('returns false when target is in the future', () => {
      expect(isPast(referenceMs + 1000, referenceMs)).toBe(false);
    });
  });

  describe('isFuture()', () => {
    it('returns true when target is strictly in the future', () => {
      expect(isFuture(referenceMs + 1000, referenceMs)).toBe(true);
    });

    it('returns false when target is exactly equal to reference time', () => {
      expect(isFuture(referenceMs, referenceMs)).toBe(false);
    });

    it('returns false when target is in the past', () => {
      expect(isFuture(referenceMs - 1000, referenceMs)).toBe(false);
    });
  });
});
