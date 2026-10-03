/**
 * Pure Domain Rule Engine
 * Decides whether to allow, show intervention message, or enforce app lock.
 * ZERO React or Native imports.
 */

import type { Rule, AppState, EnforcementDecision } from './types';
import { formatLocalDateString } from './time';

export interface EvaluationOptions {
  // Optional deterministic random index selector for testing message rotation
  randomSelector?: (max: number) => number;
}

/**
 * Normalizes an AppState for the current calendar day.
 * If the current day is different from usageDate, today's usage counter resets to 0.
 */
export function normalizeAppStateForDate(appState: AppState, now: number): AppState {
  const today = formatLocalDateString(now);
  if (appState.usageDate === today) {
    return appState;
  }

  // Automatic midnight rollover: reset counter for the new day
  return {
    ...appState,
    usedTodaySeconds: 0,
    usageDate: today,
    // If an active lock exists and hasn't expired yet, preserve it until its timestamp
    lockedUntil:
      appState.lockedUntil && appState.lockedUntil > now ? appState.lockedUntil : undefined,
  };
}

/**
 * Evaluates the enforcement state for a specific app given its assigned rule and current state.
 * Returns one of:
 * - { type: 'allow' }
 * - { type: 'show_message', message, delaySeconds }
 * - { type: 'lock', lockedUntil }
 */
export function evaluateEnforcement(
  rule: Rule,
  rawAppState: AppState,
  now: number,
  options: EvaluationOptions = {}
): EnforcementDecision {
  // 1. If rule is disabled, app usage is unconstrained
  if (!rule.enabled) {
    return { type: 'allow' };
  }

  // 2. Normalize usage for today's local date
  const appState = normalizeAppStateForDate(rawAppState, now);

  // 3. Check for active lock
  if (appState.lockedUntil !== undefined) {
    if (appState.lockedUntil > now) {
      // Lock is still active
      return {
        type: 'lock',
        lockedUntil: appState.lockedUntil,
      };
    }
    // Lock has expired; continue to limit evaluation
  }

  // 4. Check if daily time limit has been reached
  const limitSeconds = rule.limitMinutes * 60;
  if (appState.usedTodaySeconds >= limitSeconds) {
    // Limit reached or exceeded! Calculate lock expiration
    const lockDurationMs = rule.blockMinutes * 60 * 1000;
    const lockUntil = now + lockDurationMs;

    return {
      type: 'lock',
      lockedUntil: lockUntil,
    };
  }

  // 5. Under limit: Show mindful intervention message with configured delay
  const messageCount = rule.messages.length;
  let chosenMessage = 'Take a mindful pause.';

  if (messageCount > 0) {
    const selector = options.randomSelector ?? ((max: number) => Math.floor(Math.random() * max));
    const index = Math.max(0, Math.min(messageCount - 1, selector(messageCount)));
    chosenMessage = rule.messages[index] ?? rule.messages[0] ?? chosenMessage;
  }

  return {
    type: 'show_message',
    message: chosenMessage,
    delaySeconds: rule.delaySeconds,
  };
}

/**
 * Increments usage seconds for an app, performing automatic midnight rollover if crossing midnight.
 */
export function recordUsageTick(
  rawAppState: AppState,
  elapsedSeconds: number,
  now: number
): AppState {
  if (elapsedSeconds <= 0) return rawAppState;

  const appState = normalizeAppStateForDate(rawAppState, now);

  return {
    ...appState,
    usedTodaySeconds: appState.usedTodaySeconds + elapsedSeconds,
  };
}

/**
 * Creates an initial clean AppState for an app newly assigned to a rule.
 */
export function createInitialAppState(appId: string, ruleId: string, now: number): AppState {
  return {
    appId,
    ruleId,
    usedTodaySeconds: 0,
    usageDate: formatLocalDateString(now),
  };
}
