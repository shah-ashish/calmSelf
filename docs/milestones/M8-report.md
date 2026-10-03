# Milestone 8 Report: Reliability and Edge Cases

* **Branch**: `milestone-8-reliability`
* **Status**: Complete & Verified
* **Date**: 2026-10-04
* **Author**: Antigravity Agent & Ashish Shah

---

## 1. What Was Built

In strict adherence to Sections 2, 3, 4, and 5 of [`docs/SPEC.md`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/docs/SPEC.md), Milestone 8 addresses system reliability, edge cases, background-to-foreground lifecycle transitions, and automatic recovery:

1. **Pure Domain Time Safety & Tamper Resistance ([`src/domain/time.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/time.ts))**:
   * [`safeElapsedSeconds(previousMs, currentMs, maxAllowedSeconds)`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/time.ts#L43): Clamps negative intervals (caused by device clock drift backwards or manual clock tampering) to 0. Caps excessively large intervals to `maxAllowedSeconds` (default: 86,400s / 24h) to avoid runaway daily counters from unexpected gaps or device reboots.
   * [`isPast(targetMs, referenceMs)`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/time.ts#L61) and [`isFuture(targetMs, referenceMs)`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/time.ts#L68) comparison helpers.

2. **Cooldown Lock Expiration Refinement ([`src/domain/ruleEngine.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/ruleEngine.ts))**:
   * **Problem Identified**: When a user exceeded their daily limit and served the full cooldown block duration (e.g. 15 minutes), subsequent opens on the same calendar day still had `usedTodaySeconds >= limitSeconds`. Without state tracking of completed cooldowns, the engine would re-evaluate the limit breach and generate an infinite re-locking loop, preventing the user from ever accessing the app for the remainder of the day.
   * **Resolution**: When `appState.lockedUntil !== undefined && appState.lockedUntil <= now`, the cooldown has been served. [`evaluateEnforcement`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/ruleEngine.ts#L43) now allows opening through the mindful intervention overlay (`show_message` with pause delay countdown). Carried-over expired locks are cleaned up when crossing midnight, re-enabling lock enforcement when the next day's limit is reached.

3. **Enforcement Watchdog Self-Healing ([`src/features/enforcement/EnforcementController.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/enforcement/EnforcementController.ts))**:
   * Implemented [`healthCheck(): Promise<HealthCheckResult>`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/enforcement/EnforcementController.ts#L228):
     * Drains any queued intercepts that accumulated in the native buffer while backgrounded.
     * Verifies overlay and usage stats permissions via [`BlockerAdapter.checkPermissions`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/platform/blocker/interface.ts#L30).
     * Compares active rule packages against the blocker's current blocked packages and monitoring state.
     * Automatically restarts killed background services and resynchronizes packages via `syncRulesToBlocker()` when discrepancies are detected.

4. **App Lifecycle Coordinator ([`src/features/lifecycle/`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/lifecycle/))**:
   * Implemented [`AppLifecycleCoordinator`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/lifecycle/AppLifecycleCoordinator.ts): coordinates background-to-foreground transitions and boot sequence:
     * Re-verifies platform permissions on foregrounding.
     * Invokes [`RulesController.load()`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/rules/RulesController.ts#L58) to automatically execute due pending loosening changes (past midnight) and perform automatic midnight usage resets.
     * Executes the enforcement watchdog health check and drains pending OS intercepts.
   * Implemented [`useAppLifecycle`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/lifecycle/useAppLifecycle.ts) hook subscribing to React Native's `AppState.addEventListener('change', ...)`, wired directly into [`app/_layout.tsx`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/app/_layout.tsx#L10).

5. **Uninstalled App Detection ([`src/features/rules/RulesController.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/rules/RulesController.ts))**:
   * Implemented [`getUninstalledApps(installedPackageNames: readonly string[])`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/rules/RulesController.ts#L356): compares installed package names on device against all configured packages across rules to identify and flag orphaned or uninstalled applications.

---

## 2. Verification Checklist

| Specification Item | Verification Method | Status |
|---|---|---|
| **Negative / Tampered Clock Drift** | Verified in [`timeSafety.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/domain/timeSafety.test.ts): `safeElapsedSeconds` clamps backward timestamps to 0 and caps large intervals to 86,400s. | PASS |
| **Cooldown Lock Expiration (Same Day)** | Verified in [`ruleEngine.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/domain/ruleEngine.test.ts): after served cooldown, returns `show_message` with delay countdown rather than infinitely re-locking. | PASS |
| **New Day Limit Re-locking** | Verified in `ruleEngine.test.ts`: clears carried-over expired locks and locks properly once new day limit is reached. | PASS |
| **Watchdog Health Check & Self-Healing** | Verified in [`enforcementController.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/features/enforcementController.test.ts): detects permission loss, automatically restarts stopped service, and resyncs out-of-sync packages. | PASS |
| **Background-to-Foreground Transitions** | Verified in [`lifecycle.test.tsx`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/features/lifecycle.test.tsx): triggers midnight rollover, pending change execution, permission re-check, and watchdog health check. | PASS |
| **Uninstalled Apps Detection** | Verified in [`rulesController.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/features/rulesController.test.ts): returns all configured packages missing from the installed device package list. | PASS |
| **Zero React / Native in Domain** | Verified: `src/domain/` has zero React or React Native dependencies, strictly pure TypeScript. | PASS |

---

## 3. Test Coverage & Quality Checks

```
-----------------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                                                           
-----------------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------
All files                    |   89.64 |    81.88 |   95.98 |   89.74 |                                                                                             
 data/migrations             |   94.59 |     86.2 |     100 |   94.28 |                                                                                             
  MigrationRunner.ts         |   96.87 |     91.3 |     100 |   96.66 | 87                                                                                          
  v1_to_v2.ts                |      80 |    66.66 |     100 |      80 | 12                                                                                          
 data/repositories           |   93.64 |    79.38 |     100 |   93.29 |                                                                                             
  AppStateRepository.ts      |   91.66 |       75 |     100 |    91.2 | 69,78,130-131,146-147,172-173                                                               
  RuleRepository.ts          |    96.1 |    84.44 |     100 |   95.89 | 93,149-150                                                                                  
 data/storage                |   48.38 |     12.5 |   93.33 |   48.38 |                                                                                             
  AsyncStorageAdapter.ts     |   39.62 |     6.66 |    87.5 |   39.62 | 23-51,69-70,81-103,110-111,119-120,128-129,137-138,146-147                                  
  InMemoryStorageAdapter.ts  |     100 |      100 |     100 |     100 |                                                                                             
 domain                      |   97.42 |    89.67 |   97.22 |   98.17 |                                                                                             
  changePolicy.ts            |     100 |       90 |     100 |     100 | 103,115,130,142,223-226                                                                     
  ruleEngine.ts              |   97.14 |     86.2 |      80 |     100 | 99-102                                                                                      
  time.ts                    |     100 |    91.66 |     100 |     100 | 93                                                                                          
  validation.ts              |   92.64 |    90.21 |     100 |   93.93 | 46,103,154-155                                                                              
 features/enforcement        |   88.23 |     86.2 |   85.71 |   88.69 |                                                                                             
  EnforcementController.ts   |   88.23 |     86.2 |   85.71 |   88.69 | 44-46,52-55,235-236,250-252,287-288                                                         
 features/lifecycle          |     100 |    66.66 |     100 |     100 |                                                                                             
  AppLifecycleCoordinator.ts |     100 |    66.66 |     100 |     100 | 24                                                                                          
 features/permissions        |     100 |      100 |     100 |     100 |                                                                                             
  PermissionsController.ts   |     100 |      100 |     100 |     100 |                                                                                             
 features/rules              |    92.9 |    70.49 |     100 |   92.61 |                                                                                             
  RulesController.ts         |    92.9 |    70.49 |     100 |   92.61 | 49,64-70,154,175,181,198,270,314,324                                                        
 features/rules/components   |   88.05 |     87.5 |   96.72 |   88.37 |                                                                                             
  AppUsageBadge.tsx          |   96.77 |    96.15 |     100 |   96.66 | 35                                                                                          
  EmptyRulesView.tsx         |     100 |      100 |     100 |     100 |                                                                                             
  RuleCard.tsx               |     100 |      100 |     100 |     100 |                                                                                             
  RuleForm.tsx               |   84.04 |    83.33 |   96.15 |   84.31 | 119-123,140,145-148,156-160,166-167,187-188,195-196,199-200,215,221,228,236,243,250,569-570 
 features/rules/utils        |     100 |       75 |     100 |     100 |                                                                                             
  appName.ts                 |     100 |       75 |     100 |     100 | 124                                                                                         
 platform/blocker            |   76.56 |    66.66 |    87.5 |   77.41 |                                                                                             
  ExpoAppBlockerAdapter.ts   |    62.5 |    66.66 |   72.72 |   63.15 | 36,55,63,85-110,118,126                                                                     
  MockBlockerAdapter.ts      |     100 |      100 |     100 |     100 |                                                                                             
-----------------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------

Test Suites: 20 passed, 20 total
Tests:       217 passed, 217 total
Snapshots:   0 total
```

* **Typecheck**: `npx tsc --noEmit` passed with 0 errors.
* **Lint**: `npx expo lint` passed with 0 errors, 0 warnings.
* **Unit Tests**: 20/20 test suites passed, 217/217 tests passed cleanly.

---

## 4. Known Issues & Open Questions
* None. All reliability requirements and edge case mitigations have been verified and confirmed green.

---

## 5. Next Steps
* Await human approval before opening PR and proceeding to **Milestone 9: Polish and release**.
