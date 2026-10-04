/**
 * Pure Time & Midnight Calculation Utilities.
 * Implements Clock interface and local midnight boundary logic without external libraries.
 */

import type { Clock } from './types';

/**
 * Format an epoch millisecond timestamp as YYYY-MM-DD in the device's local timezone.
 */
export function formatLocalDateString(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the exact epoch millisecond timestamp of the next local midnight (00:00:00.000).
 */
export function getNextLocalMidnight(epochMs: number): number {
  const d = new Date(epochMs);
  // Move to tomorrow
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Checks whether two epoch timestamps fall on the same local calendar day.
 */
export function isSameLocalDay(ms1: number, ms2: number): boolean {
  return formatLocalDateString(ms1) === formatLocalDateString(ms2);
}

/**
 * Safely computes elapsed seconds between two epoch timestamps in milliseconds.
 * Clamps negative delta (device clock drift backwards or manual clock tampering) to 0.
 * Caps excessively large intervals to maxAllowedSeconds (default: 86,400s / 24h)
 * to avoid runaway daily counters from unexpected gaps or device reboots.
 */
export function safeElapsedSeconds(
  previousMs: number,
  currentMs: number,
  maxAllowedSeconds: number = 86400
): number {
  if (currentMs <= previousMs) {
    return 0;
  }
  const deltaSeconds = Math.floor((currentMs - previousMs) / 1000);
  return Math.min(deltaSeconds, maxAllowedSeconds);
}

/**
 * Checks if a target timestamp is in the past or current relative to reference time.
 */
export function isPast(targetMs: number, referenceMs: number): boolean {
  return targetMs <= referenceMs;
}

/**
 * Checks if a target timestamp is strictly in the future relative to reference time.
 */
export function isFuture(targetMs: number, referenceMs: number): boolean {
  return targetMs > referenceMs;
}

/**
 * Default production clock backed by system time.
 */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  todayDateString(epochMs?: number): string {
    return formatLocalDateString(epochMs ?? this.now());
  }

  nextLocalMidnight(epochMs?: number): number {
    return getNextLocalMidnight(epochMs ?? this.now());
  }
}

/**
 * Controllable Mock Clock for unit testing.
 * Time only moves when explicitly set or advanced.
 */
export class MockClock implements Clock {
  private currentMs: number;

  constructor(initialMs: number = Date.UTC(2026, 9, 3, 12, 0, 0)) {
    this.currentMs = initialMs;
  }

  now(): number {
    return this.currentMs;
  }

  todayDateString(epochMs?: number): string {
    return formatLocalDateString(epochMs ?? this.currentMs);
  }

  nextLocalMidnight(epochMs?: number): number {
    return getNextLocalMidnight(epochMs ?? this.currentMs);
  }

  setTime(epochMs: number): void {
    this.currentMs = epochMs;
  }

  advanceSeconds(seconds: number): void {
    this.currentMs += seconds * 1000;
  }

  advanceMinutes(minutes: number): void {
    this.currentMs += minutes * 60 * 1000;
  }

  advanceHours(hours: number): void {
    this.currentMs += hours * 60 * 60 * 1000;
  }

  advanceDays(days: number): void {
    this.currentMs += days * 24 * 60 * 60 * 1000;
  }
}
