/**
 * Pure Asymmetric Change Policy
 * Implements Business Rule 3:
 * - Tightening applies instantly (lower limit, longer delay, longer block, adding app, turning ON).
 * - Loosening applies from next local midnight (higher limit, shorter delay, shorter block, removing app, turning OFF, deleting rule).
 * - Mixed edits are split: tightening applies now, loosening becomes pending.
 * - Pending loosening changes can be undone.
 */

import type { Rule, RulePatch, PendingChange } from './types';

export type ChangeType = 'tightening' | 'loosening' | 'neutral';

export interface SplitResult {
  readonly updatedRule: Rule;
  readonly hasTightening: boolean;
  readonly hasLoosening: boolean;
  readonly pendingChange?: PendingChange;
}

/**
 * Compares two values for limitMinutes.
 * Lower limit = Tightening, Higher limit = Loosening.
 */
export function classifyLimitChange(oldVal: number, newVal: number): ChangeType {
  if (newVal < oldVal) return 'tightening';
  if (newVal > oldVal) return 'loosening';
  return 'neutral';
}

/**
 * Compares two values for delaySeconds.
 * Longer delay = Tightening, Shorter delay = Loosening.
 */
export function classifyDelayChange(oldVal: number, newVal: number): ChangeType {
  if (newVal > oldVal) return 'tightening';
  if (newVal < oldVal) return 'loosening';
  return 'neutral';
}

/**
 * Compares two values for blockMinutes.
 * Longer block = Tightening, Shorter block = Loosening.
 */
export function classifyBlockDurationChange(oldVal: number, newVal: number): ChangeType {
  if (newVal > oldVal) return 'tightening';
  if (newVal < oldVal) return 'loosening';
  return 'neutral';
}

/**
 * Compares rule enabled state.
 * Turning ON = Tightening, Turning OFF = Loosening.
 */
export function classifyEnabledChange(oldVal: boolean, newVal: boolean): ChangeType {
  if (!oldVal && newVal) return 'tightening';
  if (oldVal && !newVal) return 'loosening';
  return 'neutral';
}

/**
 * Compares app lists.
 * Adding an app = Tightening.
 * Removing an app = Loosening.
 */
export function classifyAppListChanges(
  oldApps: readonly string[],
  newApps: readonly string[]
): { readonly added: readonly string[]; readonly removed: readonly string[] } {
  const oldSet = new Set(oldApps);
  const newSet = new Set(newApps);

  const added = newApps.filter((a) => !oldSet.has(a));
  const removed = oldApps.filter((a) => !newSet.has(a));

  return { added, removed };
}

/**
 * Applies a desired patch to an existing rule according to the asymmetric change policy.
 * Tightening parts apply immediately; loosening parts become pending until `effectiveAt`.
 */
type MutableRule = { -readonly [P in keyof Rule]?: Rule[P] };
type MutablePatch = { -readonly [P in keyof RulePatch]?: RulePatch[P] };

export function applyChangePolicy(
  currentRule: Rule,
  desired: RulePatch,
  effectiveAt: number
): SplitResult {
  let hasTightening = false;
  let hasLoosening = false;

  const immediatePatch: MutableRule = {};
  const pendingPatch: MutablePatch = {};

  // 1. Limit Minutes (lower = tightening, higher = loosening)
  if (desired.limitMinutes !== undefined && desired.limitMinutes !== currentRule.limitMinutes) {
    const classification = classifyLimitChange(currentRule.limitMinutes, desired.limitMinutes);
    if (classification === 'tightening') {
      immediatePatch.limitMinutes = desired.limitMinutes;
      hasTightening = true;
    } else if (classification === 'loosening') {
      pendingPatch.limitMinutes = desired.limitMinutes;
      hasLoosening = true;
    }
  }

  // 2. Delay Seconds (longer = tightening, shorter = loosening)
  if (desired.delaySeconds !== undefined && desired.delaySeconds !== currentRule.delaySeconds) {
    const classification = classifyDelayChange(currentRule.delaySeconds, desired.delaySeconds);
    if (classification === 'tightening') {
      immediatePatch.delaySeconds = desired.delaySeconds;
      hasTightening = true;
    } else if (classification === 'loosening') {
      pendingPatch.delaySeconds = desired.delaySeconds;
      hasLoosening = true;
    }
  }

  // 3. Block Minutes (longer = tightening, shorter = loosening)
  if (desired.blockMinutes !== undefined && desired.blockMinutes !== currentRule.blockMinutes) {
    const classification = classifyBlockDurationChange(
      currentRule.blockMinutes,
      desired.blockMinutes
    );
    if (classification === 'tightening') {
      immediatePatch.blockMinutes = desired.blockMinutes;
      hasTightening = true;
    } else if (classification === 'loosening') {
      pendingPatch.blockMinutes = desired.blockMinutes;
      hasLoosening = true;
    }
  }

  // 4. Enabled State (ON = tightening, OFF = loosening)
  if (desired.enabled !== undefined && desired.enabled !== currentRule.enabled) {
    const classification = classifyEnabledChange(currentRule.enabled, desired.enabled);
    if (classification === 'tightening') {
      immediatePatch.enabled = desired.enabled;
      hasTightening = true;
    } else if (classification === 'loosening') {
      pendingPatch.enabled = desired.enabled;
      hasLoosening = true;
    }
  }

  // 5. App IDs (Added = tightening, Removed = loosening)
  if (desired.appIds !== undefined) {
    const { added, removed } = classifyAppListChanges(currentRule.appIds, desired.appIds);

    let nextImmediateApps = [...currentRule.appIds];

    if (added.length > 0) {
      // Added apps apply immediately!
      nextImmediateApps = [...new Set([...nextImmediateApps, ...added])];
      immediatePatch.appIds = nextImmediateApps;
      hasTightening = true;
    }

    if (removed.length > 0) {
      // Removing apps is loosening -> effective at midnight!
      // The pending patch records the final desired app list
      pendingPatch.appIds = desired.appIds;
      hasLoosening = true;
    }
  }

  // 6. Messages (Neutral / Content updates apply immediately)
  if (desired.messages !== undefined) {
    immediatePatch.messages = desired.messages;
  }

  // Build the updated rule with immediate changes applied
  let pendingChange: PendingChange | undefined = currentRule.pendingChange;

  if (hasLoosening) {
    pendingChange = {
      patch: {
        ...(currentRule.pendingChange?.patch ?? {}),
        ...pendingPatch,
      },
      effectiveAt,
    };
  }

  const updatedRule: Rule = {
    ...currentRule,
    ...immediatePatch,
    pendingChange,
  };

  return {
    updatedRule,
    hasTightening,
    hasLoosening,
    pendingChange,
  };
}

/**
 * Reverts any pending loosening changes on the rule.
 */
export function undoPendingChange(rule: Rule): Rule {
  const { pendingChange: _, ...rest } = rule;
  return rest as Rule;
}

/**
 * Evaluates whether any pending changes on the rule are due and applies them if due.
 */
export function applyDuePendingChanges(rule: Rule, now: number): Rule {
  if (!rule.pendingChange || now < rule.pendingChange.effectiveAt) {
    return rule;
  }

  const { patch } = rule.pendingChange;

  return {
    ...rule,
    ...(patch.limitMinutes !== undefined ? { limitMinutes: patch.limitMinutes } : {}),
    ...(patch.delaySeconds !== undefined ? { delaySeconds: patch.delaySeconds } : {}),
    ...(patch.blockMinutes !== undefined ? { blockMinutes: patch.blockMinutes } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.appIds !== undefined ? { appIds: patch.appIds } : {}),
    ...(patch.messages !== undefined ? { messages: patch.messages } : {}),
    pendingChange: undefined,
  };
}
