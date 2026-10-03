# Milestone 2 Report: Domain Layer (Pure Logic)

**Milestone**: M2 (Domain layer - pure logic)  
**Branch**: `milestone-2-domain`  
**Date**: 2026-10-03  
**Status**: Ready for Human Approval  

---

## 1. What Was Built
* **Clock & Midnight Boundaries ([`src/domain/time.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/time.ts))**:
  * Implemented `Clock` interface, production `SystemClock`, and controllable `MockClock`.
  * Pure calendar math: `formatLocalDateString(epochMs)`, `getNextLocalMidnight(epochMs)` (calculates exact `00:00:00.000`), and `isSameLocalDay()`.
* **Rule Engine ([`src/domain/ruleEngine.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/ruleEngine.ts))**:
  * Pure decision function `evaluateEnforcement(rule, appState, now)` returning `allow`, `show_message`, or `lock`.
  * Automatic midnight rollover: resets `usedTodaySeconds` when calendar day advances.
  * Active lock preservation: locks spanning midnight are preserved until expiration.
  * Independent per-app state: each app tracks its own usage and lock independently of other apps in the same rule.
* **Asymmetric Change Policy ([`src/domain/changePolicy.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/changePolicy.ts))**:
  * Implements Business Rule 3:
    * **Tightening**: lower limit, longer delay, longer block, adding an app, turning ON $\rightarrow$ applies immediately.
    * **Loosening**: higher limit, shorter delay, shorter block, removing an app, turning OFF $\rightarrow$ becomes pending until next local midnight.
    * **Mixed Edits**: automatically split between immediate tightening and pending loosening.
    * **Undo Action**: `undoPendingChange(rule)` reverts pending changes.
    * **Due Execution**: `applyDuePendingChanges(rule, now)` applies pending changes when midnight passes.
* **Input & Invariant Validation ([`src/domain/validation.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/validation.ts))**:
  * Strict field bounds (limits 1–1440m, delay 0–60s, block 5–1440m, messages 1–10, length 1–300 chars).
  * Enforces Business Rule 1: **1 App $\le$ 1 Rule** (rejects conflicting app assignments).
* **Comprehensive Test Suite**:
  * 53 unit tests passing in plain Node across 5 test suites.

---

## 2. Checklist Verification Summary

| Item | Status | Verification Method |
|---|---|---|
| Domain code has no React or native imports | **Verified** | Enforced by ESLint `no-restricted-imports` rule in `eslint.config.js`. Verified via `npm run lint` (0 errors). |
| Unit tests cover: under limit, exactly at limit, over limit, lock active, lock expired, midnight rollover, two apps in one rule with independent state | **Verified** | Covered in [`__tests__/domain/ruleEngine.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/domain/ruleEngine.test.ts). |
| Unit tests cover every tightening and loosening case in Section 2, including mixed edit and Undo | **Verified** | Covered in [`__tests__/domain/changePolicy.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/domain/changePolicy.test.ts). |
| Tests control time through the injected clock, never the real one | **Verified** | All domain tests use `MockClock`. `Date.now()` is never called in domain logic. |
| Coverage of `src/domain` is above 90 percent | **Verified** | **Overall Domain Coverage: 96.84% statements, 97.59% lines**. |

### Detailed Coverage Breakdown

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   96.84 |    87.31 |   96.96 |   97.59 |                   
 changePolicy.ts |   98.93 |    86.25 |     100 |    98.8 |                   
 ruleEngine.ts   |   96.96 |    79.16 |      80 |     100 |                   
 time.ts         |     100 |    88.88 |     100 |     100 |                   
 validation.ts   |   92.64 |    90.21 |     100 |   93.93 |                   
-----------------|---------|----------|---------|---------|-------------------
```

---

## 3. Known Issues
None. All automated quality checks pass with zero errors.

---

## 4. Open Questions for Human Approval
1. **Approval**: Do you approve Milestone 2 for merge into `main`?
2. **Next Milestone**: Upon your approval, shall we proceed to **Milestone 3: Data Layer** to implement the storage adapter, schema versioning, migration runner, and repositories?
