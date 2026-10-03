import { LIMITS } from '@/config/constants';
import { ok, err } from '@/lib/result';

describe('Domain & Project Scaffold Smoke Tests', () => {
  it('loads constants correctly', () => {
    expect(LIMITS.DEFAULT_TIME_LIMIT_MINUTES).toBe(30);
    expect(LIMITS.DEFAULT_CONTINUE_DELAY_SECONDS).toBe(10);
    expect(LIMITS.DEFAULT_BLOCK_DURATION_MINUTES).toBe(60);
  });

  it('handles result type operations', () => {
    const successResult = ok({ ruleCount: 5 });
    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.value.ruleCount).toBe(5);
    }

    const failureResult = err(new Error('Permission denied'));
    expect(failureResult.ok).toBe(false);
    if (!failureResult.ok) {
      expect(failureResult.error.message).toBe('Permission denied');
    }
  });
});
