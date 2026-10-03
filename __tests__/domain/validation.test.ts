import type { Rule } from '@/domain/types';
import { validateRuleInput, validateRulePatch, type RuleInput } from '@/domain/validation';

describe('Domain: Validation', () => {
  const existingRules: Rule[] = [
    {
      id: 'rule-existing-1',
      messages: ['Existing rule message'],
      limitMinutes: 30,
      delaySeconds: 10,
      blockMinutes: 60,
      appIds: ['com.instagram.android', 'com.twitter.android'],
      enabled: true,
      schemaVersion: 1,
    },
  ];

  const validRuleInput: RuleInput = {
    messages: ['Pause and reflect.'],
    limitMinutes: 45,
    delaySeconds: 15,
    blockMinutes: 60,
    appIds: ['com.reddit.frontpage'],
    enabled: true,
  };

  describe('validateRuleInput()', () => {
    it('accepts valid rule input', () => {
      const result = validateRuleInput(validRuleInput, existingRules);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.messages).toEqual(['Pause and reflect.']);
        expect(result.value.limitMinutes).toBe(45);
        expect(result.value.delaySeconds).toBe(15);
        expect(result.value.blockMinutes).toBe(60);
        expect(result.value.appIds).toEqual(['com.reddit.frontpage']);
        expect(result.value.enabled).toBe(true);
      }
    });

    it('rejects empty messages list', () => {
      const result = validateRuleInput({ ...validRuleInput, messages: [] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e) => e.field === 'messages')).toBe(true);
      }
    });

    it('rejects more than 10 messages', () => {
      const manyMessages = Array.from({ length: 11 }, (_, i) => `Message ${i}`);
      const result = validateRuleInput({ ...validRuleInput, messages: manyMessages });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e) => e.field === 'messages')).toBe(true);
      }
    });

    it('rejects messages longer than 300 characters', () => {
      const longMessage = 'a'.repeat(301);
      const result = validateRuleInput({ ...validRuleInput, messages: [longMessage] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e) => e.field.startsWith('messages'))).toBe(true);
      }
    });

    it('rejects invalid limitMinutes', () => {
      const zeroLimit = validateRuleInput({ ...validRuleInput, limitMinutes: 0 });
      expect(zeroLimit.ok).toBe(false);

      const highLimit = validateRuleInput({ ...validRuleInput, limitMinutes: 1441 });
      expect(highLimit.ok).toBe(false);

      const floatLimit = validateRuleInput({ ...validRuleInput, limitMinutes: 30.5 });
      expect(floatLimit.ok).toBe(false);
    });

    it('rejects invalid delaySeconds', () => {
      const negativeDelay = validateRuleInput({ ...validRuleInput, delaySeconds: -1 });
      expect(negativeDelay.ok).toBe(false);

      const highDelay = validateRuleInput({ ...validRuleInput, delaySeconds: 61 });
      expect(highDelay.ok).toBe(false);
    });

    it('rejects invalid blockMinutes', () => {
      const shortBlock = validateRuleInput({ ...validRuleInput, blockMinutes: 4 });
      expect(shortBlock.ok).toBe(false);

      const longBlock = validateRuleInput({ ...validRuleInput, blockMinutes: 1441 });
      expect(longBlock.ok).toBe(false);
    });

    it('rejects empty app list', () => {
      const noApps = validateRuleInput({ ...validRuleInput, appIds: [] });
      expect(noApps.ok).toBe(false);
      if (!noApps.ok) {
        expect(noApps.error.some((e) => e.field === 'appIds')).toBe(true);
      }
    });

    it('rejects duplicate app IDs in the same rule', () => {
      const dupApps = validateRuleInput({
        ...validRuleInput,
        appIds: ['com.reddit.frontpage', 'com.reddit.frontpage'],
      });
      expect(dupApps.ok).toBe(false);
    });

    it('enforces Business Rule 1: rejects an app already in another rule', () => {
      // com.instagram.android belongs to rule-existing-1
      const conflictResult = validateRuleInput(
        { ...validRuleInput, appIds: ['com.instagram.android'] },
        existingRules
      );

      expect(conflictResult.ok).toBe(false);
      if (!conflictResult.ok) {
        expect(conflictResult.error[0]?.message).toContain(
          "already assigned to another rule (rule-existing-1)"
        );
      }
    });

    it('allows keeping same apps when updating an existing rule', () => {
      // Editing rule-existing-1 itself
      const selfUpdate = validateRuleInput(
        {
          messages: ['Updated'],
          limitMinutes: 20,
          delaySeconds: 10,
          blockMinutes: 60,
          appIds: ['com.instagram.android'],
        },
        existingRules,
        'rule-existing-1'
      );

      expect(selfUpdate.ok).toBe(true);
    });
  });

  describe('validateRulePatch()', () => {
    it('accepts valid partial patch', () => {
      const patch = validateRulePatch({ limitMinutes: 40, delaySeconds: 5 });
      expect(patch.ok).toBe(true);
    });

    it('rejects invalid fields in patch', () => {
      const invalidLimit = validateRulePatch({ limitMinutes: -5 });
      expect(invalidLimit.ok).toBe(false);

      const invalidDelay = validateRulePatch({ delaySeconds: 100 });
      expect(invalidDelay.ok).toBe(false);

      const invalidBlock = validateRulePatch({ blockMinutes: 2 });
      expect(invalidBlock.ok).toBe(false);

      const emptyMessages = validateRulePatch({ messages: [] });
      expect(emptyMessages.ok).toBe(false);

      const emptyApps = validateRulePatch({ appIds: [] });
      expect(emptyApps.ok).toBe(false);
    });

    it('rejects patch conflicting with another rule', () => {
      const conflict = validateRulePatch(
        { appIds: ['com.instagram.android'] },
        existingRules,
        'other-rule-id'
      );
      expect(conflict.ok).toBe(false);
    });
  });
});
