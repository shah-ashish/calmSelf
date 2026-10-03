/**
 * Pure Domain Validation Logic
 * Validates rule inputs, field boundaries, and ensures 1 App <= 1 Rule invariant.
 */

import { LIMITS } from '@/config/constants';
import type { Rule, RulePatch } from './types';
import { type Result, ok, err } from '@/lib/result';

export interface RuleValidationError {
  readonly field: string;
  readonly message: string;
}

export interface RuleInput {
  readonly messages: readonly string[];
  readonly limitMinutes: number;
  readonly delaySeconds: number;
  readonly blockMinutes: number;
  readonly appIds: readonly string[];
  readonly enabled?: boolean;
}

/**
 * Validates a rule input payload before creation or application.
 */
export function validateRuleInput(
  input: RuleInput,
  existingRules: readonly Rule[] = [],
  currentRuleId?: string
): Result<RuleInput, readonly RuleValidationError[]> {
  const errors: RuleValidationError[] = [];

  // Messages validation
  if (!input.messages || input.messages.length === 0) {
    errors.push({ field: 'messages', message: 'At least one intervention message is required.' });
  } else if (input.messages.length > LIMITS.MAX_RULE_MESSAGES) {
    errors.push({
      field: 'messages',
      message: `Maximum of ${LIMITS.MAX_RULE_MESSAGES} messages allowed per rule.`,
    });
  } else {
    for (let i = 0; i < input.messages.length; i++) {
      const msg = input.messages[i]?.trim();
      if (!msg || msg.length < LIMITS.MIN_MESSAGE_LENGTH) {
        errors.push({ field: `messages[${i}]`, message: 'Message cannot be empty.' });
      } else if (msg.length > LIMITS.MAX_MESSAGE_LENGTH) {
        errors.push({
          field: `messages[${i}]`,
          message: `Message cannot exceed ${LIMITS.MAX_MESSAGE_LENGTH} characters.`,
        });
      }
    }
  }

  // Daily Limit Minutes
  if (
    typeof input.limitMinutes !== 'number' ||
    !Number.isInteger(input.limitMinutes) ||
    input.limitMinutes < LIMITS.MIN_TIME_LIMIT_MINUTES ||
    input.limitMinutes > LIMITS.MAX_TIME_LIMIT_MINUTES
  ) {
    errors.push({
      field: 'limitMinutes',
      message: `Daily limit must be an integer between ${LIMITS.MIN_TIME_LIMIT_MINUTES} and ${LIMITS.MAX_TIME_LIMIT_MINUTES} minutes.`,
    });
  }

  // Continue Delay Seconds
  if (
    typeof input.delaySeconds !== 'number' ||
    !Number.isInteger(input.delaySeconds) ||
    input.delaySeconds < LIMITS.MIN_CONTINUE_DELAY_SECONDS ||
    input.delaySeconds > LIMITS.MAX_CONTINUE_DELAY_SECONDS
  ) {
    errors.push({
      field: 'delaySeconds',
      message: `Delay must be an integer between ${LIMITS.MIN_CONTINUE_DELAY_SECONDS} and ${LIMITS.MAX_CONTINUE_DELAY_SECONDS} seconds.`,
    });
  }

  // Block Duration Minutes
  if (
    typeof input.blockMinutes !== 'number' ||
    !Number.isInteger(input.blockMinutes) ||
    input.blockMinutes < LIMITS.MIN_BLOCK_DURATION_MINUTES ||
    input.blockMinutes > LIMITS.MAX_BLOCK_DURATION_MINUTES
  ) {
    errors.push({
      field: 'blockMinutes',
      message: `Block duration must be an integer between ${LIMITS.MIN_BLOCK_DURATION_MINUTES} and ${LIMITS.MAX_BLOCK_DURATION_MINUTES} minutes.`,
    });
  }

  // App IDs validation
  if (!input.appIds || input.appIds.length === 0) {
    errors.push({ field: 'appIds', message: 'At least one target app must be selected.' });
  } else {
    // Check package name validity & uniqueness within rule
    const seen = new Set<string>();
    for (const appId of input.appIds) {
      if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
        errors.push({ field: 'appIds', message: 'App identifier cannot be empty.' });
      } else if (seen.has(appId)) {
        errors.push({ field: 'appIds', message: `Duplicate app '${appId}' in rule.` });
      } else {
        seen.add(appId);
      }
    }

    // Business Rule 1: One app belongs to at most one rule
    for (const otherRule of existingRules) {
      if (currentRuleId && otherRule.id === currentRuleId) {
        continue;
      }
      for (const appId of input.appIds) {
        if (otherRule.appIds.includes(appId)) {
          errors.push({
            field: 'appIds',
            message: `App '${appId}' is already assigned to another rule (${otherRule.id}).`,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    messages: input.messages.map((m) => m.trim()),
    limitMinutes: input.limitMinutes,
    delaySeconds: input.delaySeconds,
    blockMinutes: input.blockMinutes,
    appIds: [...new Set(input.appIds)],
    enabled: input.enabled ?? true,
  });
}

/**
 * Validates a partial patch payload.
 */
export function validateRulePatch(
  patch: RulePatch,
  existingRules: readonly Rule[] = [],
  currentRuleId?: string
): Result<RulePatch, readonly RuleValidationError[]> {
  const errors: RuleValidationError[] = [];

  if (patch.messages !== undefined) {
    if (patch.messages.length === 0) {
      errors.push({ field: 'messages', message: 'At least one intervention message is required.' });
    } else if (patch.messages.length > LIMITS.MAX_RULE_MESSAGES) {
      errors.push({
        field: 'messages',
        message: `Maximum of ${LIMITS.MAX_RULE_MESSAGES} messages allowed per rule.`,
      });
    }
  }

  if (patch.limitMinutes !== undefined) {
    if (
      !Number.isInteger(patch.limitMinutes) ||
      patch.limitMinutes < LIMITS.MIN_TIME_LIMIT_MINUTES ||
      patch.limitMinutes > LIMITS.MAX_TIME_LIMIT_MINUTES
    ) {
      errors.push({
        field: 'limitMinutes',
        message: `Daily limit must be between ${LIMITS.MIN_TIME_LIMIT_MINUTES} and ${LIMITS.MAX_TIME_LIMIT_MINUTES} minutes.`,
      });
    }
  }

  if (patch.delaySeconds !== undefined) {
    if (
      !Number.isInteger(patch.delaySeconds) ||
      patch.delaySeconds < LIMITS.MIN_CONTINUE_DELAY_SECONDS ||
      patch.delaySeconds > LIMITS.MAX_CONTINUE_DELAY_SECONDS
    ) {
      errors.push({
        field: 'delaySeconds',
        message: `Delay must be between ${LIMITS.MIN_CONTINUE_DELAY_SECONDS} and ${LIMITS.MAX_CONTINUE_DELAY_SECONDS} seconds.`,
      });
    }
  }

  if (patch.blockMinutes !== undefined) {
    if (
      !Number.isInteger(patch.blockMinutes) ||
      patch.blockMinutes < LIMITS.MIN_BLOCK_DURATION_MINUTES ||
      patch.blockMinutes > LIMITS.MAX_BLOCK_DURATION_MINUTES
    ) {
      errors.push({
        field: 'blockMinutes',
        message: `Block duration must be between ${LIMITS.MIN_BLOCK_DURATION_MINUTES} and ${LIMITS.MAX_BLOCK_DURATION_MINUTES} minutes.`,
      });
    }
  }

  if (patch.appIds !== undefined) {
    if (patch.appIds.length === 0) {
      errors.push({ field: 'appIds', message: 'At least one target app must be selected.' });
    } else {
      for (const otherRule of existingRules) {
        if (currentRuleId && otherRule.id === currentRuleId) continue;
        for (const appId of patch.appIds) {
          if (otherRule.appIds.includes(appId)) {
            errors.push({
              field: 'appIds',
              message: `App '${appId}' is already assigned to another rule (${otherRule.id}).`,
            });
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(patch);
}
