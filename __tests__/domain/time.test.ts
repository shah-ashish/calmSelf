import {
  formatLocalDateString,
  getNextLocalMidnight,
  isSameLocalDay,
  SystemClock,
  MockClock,
} from '@/domain/time';

describe('Domain: Time & Clock Utilities', () => {
  it('formats epoch timestamp as local YYYY-MM-DD', () => {
    // 2026-10-03
    const date = new Date(2026, 9, 3, 15, 30, 0);
    expect(formatLocalDateString(date.getTime())).toBe('2026-10-03');
  });

  it('calculates exact next local midnight (00:00:00.000)', () => {
    const afternoon = new Date(2026, 9, 3, 14, 30, 45, 500).getTime();
    const midnight = getNextLocalMidnight(afternoon);

    const midnightDate = new Date(midnight);
    expect(midnightDate.getFullYear()).toBe(2026);
    expect(midnightDate.getMonth()).toBe(9); // October (0-indexed)
    expect(midnightDate.getDate()).toBe(4);
    expect(midnightDate.getHours()).toBe(0);
    expect(midnightDate.getMinutes()).toBe(0);
    expect(midnightDate.getSeconds()).toBe(0);
    expect(midnightDate.getMilliseconds()).toBe(0);
  });

  it('correctly compares whether two timestamps are on the same local day', () => {
    const morning = new Date(2026, 9, 3, 8, 0, 0).getTime();
    const evening = new Date(2026, 9, 3, 23, 59, 0).getTime();
    const tomorrowMorning = new Date(2026, 9, 4, 0, 1, 0).getTime();

    expect(isSameLocalDay(morning, evening)).toBe(true);
    expect(isSameLocalDay(morning, tomorrowMorning)).toBe(false);
  });

  it('MockClock accurately controls and advances time', () => {
    const baseTime = new Date(2026, 9, 3, 10, 0, 0).getTime();
    const mock = new MockClock(baseTime);

    expect(mock.now()).toBe(baseTime);
    expect(mock.todayDateString()).toBe('2026-10-03');

    // Advance 30 seconds
    mock.advanceSeconds(30);
    expect(mock.now()).toBe(baseTime + 30 * 1000);

    // Advance 10 minutes
    mock.advanceMinutes(10);
    expect(mock.now()).toBe(baseTime + 30 * 1000 + 10 * 60 * 1000);

    // Advance 2 hours
    mock.advanceHours(2);
    expect(mock.now()).toBe(baseTime + 30 * 1000 + 10 * 60 * 1000 + 2 * 3600 * 1000);

    // Advance 1 day
    mock.advanceDays(1);
    expect(mock.todayDateString()).toBe('2026-10-04');

    // Explicit setTime
    const newTime = new Date(2027, 0, 1).getTime();
    mock.setTime(newTime);
    expect(mock.now()).toBe(newTime);
    expect(mock.todayDateString()).toBe('2027-01-01');
  });

  it('SystemClock returns valid current values', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const now = clock.now();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
    expect(clock.todayDateString().length).toBe(10);
    expect(clock.nextLocalMidnight()).toBeGreaterThan(now);
  });
});
