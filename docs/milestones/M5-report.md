# Milestone 5 Report: Home Screen and Rule Card

* **Branch**: `milestone-5-home`
* **Status**: Complete & Verified
* **Date**: 2026-10-03
* **Author**: Antigravity Agent & Ashish Shah

---

## 1. What Was Built

In strict adherence to Sections 2, 5, and 6 of `docs/SPEC.md`, Milestone 5 delivers the responsive Home Screen and Rule Card system:

1. **Friendly Application Metadata Resolver (`src/features/rules/utils/appName.ts`)**:
   * Maps Android package names (e.g., `com.instagram.android`, `com.google.android.youtube`, `com.reddit.frontpage`, `com.zhiliaoapp.musically`, `com.twitter.android`, etc.) to human-friendly app titles, representative emoji icons, and brand colors.
   * Graceful fallback capitalizing package name segments for unknown third-party apps.

2. **Rules Controller & State Management (`src/features/rules/RulesController.ts`, `defaultRepositories.ts`)**:
   * Decoupled state management coordinating [`RuleRepository`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/data/repositories/RuleRepository.ts) and [`AppStateRepository`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/data/repositories/AppStateRepository.ts) with injected [`Clock`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/time.ts).
   * **Automatic Midnight Rollover**: Automatically resets daily used seconds on calendar date changes while preserving active, unexpired locks.
   * **Automatic Due Change Application**: Detects rules with pending loosening changes whose `effectiveAt` has passed local midnight and applies them instantly on load.
   * **Asymmetric Rule Toggle**:
     * *Turning ON (Tightening)*: Applies immediately, persists enabled rule state to storage.
     * *Turning OFF (Loosening)*: Schedules change for the next local midnight using [`applyChangePolicy`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/changePolicy.ts) and stores `pendingChange`.
   * **Instant Undo Action**: Reverts pending changes using [`undoPendingChange`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/domain/changePolicy.ts).
   * **Rule Deletion**: Deletes rule from repository and automatically cleans up associated app state records.

3. **React Integration Hook (`src/features/rules/useRules.ts`)**:
   * Uses React 18/19 `useSyncExternalStore` for tear-free state synchronization with `RulesController`.
   * Exposes rules, app states, loading/error states, and async operations (`refresh`, `toggleRule`, `undoPending`, `deleteRule`).

4. **Mindful, Accessible UI Components (`src/features/rules/components/`)**:
   * [`AppUsageBadge`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/rules/components/AppUsageBadge.tsx):
     * Displays app name, app icon, today's usage ratio (`12 / 30 min`).
     * Real-time progress bar with smooth color thresholds (Emerald green <50%, Amber 50-79%, Coral 80-99%, Danger 100%/locked).
     * Visual lock indicator (`🔒 Locked until HH:MM`) with highlighted container styling when lock is active.
   * [`RuleCard`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/rules/components/RuleCard.tsx):
     * Message preview with quote marks and `+N more` badge for multiple messages.
     * Summary badges row: `⏱️ 30m limit`, `⏳ 10s delay`, `🔒 60m lock`.
     * ON/OFF switch toggle with accessibility labels and hints.
     * Pending change banner with clear description (e.g., "Turning off tomorrow at midnight") and prominent **Undo** button.
     * Protected apps list rendering `AppUsageBadge` items.
     * Action buttons: "✏️ Edit Rule" (routes to `/rule/[id]`) and "🗑️ Delete" (prompts for confirmation).
   * [`EmptyRulesView`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/src/features/rules/components/EmptyRulesView.tsx):
     * Warm, mindful zero-state view highlighting key app benefits.
     * Accessible CTA button "+ Create Your First Rule" routing to `/rule/new`.

5. **Screen Integration (`app/index.tsx`)**:
   * Combines permissions safeguard banner with rules feed.
   * Pull-to-refresh (`RefreshControl`) re-checking both permissions and storage state.
   * Native delete confirmation alert (`Alert.alert`) preventing accidental deletions (Business Rule 4).
   * Counter badge displaying total active protection rules.

---

## 2. Verification Checklist

| Specification Item | Verification Method | Status |
|---|---|---|
| **A list of Rule cards, plus an Add button** | Verified in [`app/index.tsx`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/app/index.tsx) and [`__tests__/features/ruleComponents.test.tsx`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/features/ruleComponents.test.tsx). Cards render with full metadata; Add button routes to `/rule/new`. | PASS |
| **Message preview: first one, truncated, "+N more" if several** | Verified in `RuleCard.tsx`: quotes first message, uses `numberOfLines={2}`, and displays `+N more` badge when `messages.length > 1`. Verified in unit tests. | PASS |
| **Summary line: limit, delay, lock duration** | Verified in `RuleCard.tsx` rendering badges for daily limit, pause delay, and cooldown duration. | PASS |
| **ON/OFF switch with asymmetric tightening vs loosening** | Verified in [`__tests__/features/rulesController.test.ts`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/__tests__/features/rulesController.test.ts): Turning ON applies immediately (tightening); turning OFF schedules `pendingChange` for next local midnight (loosening). | PASS |
| **Pending loosening change shown on card with Undo action** | Verified in `RuleCard.tsx` and unit tests: displays "Turning off tomorrow at midnight" banner and executing Undo reverts the pending change. | PASS |
| **Connected app icons with today's usage per app and lock marker** | Verified in `AppUsageBadge.tsx` and unit tests: displays friendly app icon, name, formatted usage (`12 / 30 min`), progress bar, and `🔒 Locked until HH:MM` badge. | PASS |
| **Edit button and Delete button** | Verified in `RuleCard.tsx`: Edit button triggers navigation to `/rule/[id]`; Delete button triggers confirmation dialog before removal. | PASS |
| **Delete asks for confirmation** | Verified in `app/index.tsx`: `Alert.alert` prompts user with Cancel and Delete options before calling `deleteRule`. | PASS |
| **Accessibility labels on interactive elements** | Verified: every `Switch`, `TouchableOpacity`, and card container has `accessible={true}`, `accessibilityRole`, and `accessibilityLabel`. | PASS |

---

## 3. Test Coverage & Quality Checks

```
----------------------------|---------|----------|---------|---------|-------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s             
----------------------------|---------|----------|---------|---------|-------------------------------
All files                   |   94.83 |    85.81 |   99.23 |    94.9 |                               
 data/migrations            |   94.59 |     86.2 |     100 |   94.28 |                               
  MigrationRunner.ts        |   96.87 |     91.3 |     100 |   96.66 | 87                            
  v1_to_v2.ts               |      80 |    66.66 |     100 |      80 | 12                            
 data/repositories          |   93.64 |    79.38 |     100 |   93.29 |                               
  AppStateRepository.ts     |   91.66 |       75 |     100 |    91.2 | 69,78,130-131,146-147,172-173 
  RuleRepository.ts         |    96.1 |    84.44 |     100 |   95.89 | 93,149-150                    
 data/storage               |     100 |      100 |     100 |     100 |                               
  AsyncStorageAdapter.ts    |     100 |      100 |     100 |     100 |                               
  InMemoryStorageAdapter.ts |     100 |      100 |     100 |     100 |                               
 domain                     |   96.84 |    88.29 |   96.96 |   97.59 |                               
  changePolicy.ts           |   98.93 |    88.75 |     100 |    98.8 | 171                           
  ruleEngine.ts             |   96.96 |    79.16 |      80 |     100 | 59,86-89                      
  time.ts                   |     100 |    88.88 |     100 |     100 | 61                            
  validation.ts             |   92.64 |    90.21 |     100 |   93.93 | 46,103,154-155                
 features/permissions       |     100 |      100 |     100 |     100 |                               
  PermissionsController.ts  |     100 |      100 |     100 |     100 |                               
 features/rules             |    91.2 |    70.27 |     100 |    90.9 |                               
  RulesController.ts        |    91.2 |    70.27 |     100 |    90.9 | 42,57-63,147,168,174,191      
 features/rules/components  |   98.41 |    98.33 |     100 |   98.38 |                               
  AppUsageBadge.tsx         |   96.77 |    96.15 |     100 |   96.66 | 35                            
  EmptyRulesView.tsx        |     100 |      100 |     100 |     100 |                               
  RuleCard.tsx              |     100 |      100 |     100 |     100 |                               
 features/rules/utils       |     100 |       75 |     100 |     100 |                               
  appName.ts                |     100 |       75 |     100 |     100 | 105                           
 platform/blocker           |    87.5 |    66.66 |     100 |   87.23 |                               
  ExpoAppBlockerAdapter.ts  |   80.64 |    66.66 |     100 |      80 | 28,47,55,77,85,93             
  MockBlockerAdapter.ts     |     100 |      100 |     100 |     100 |                               
----------------------------|---------|----------|---------|---------|-------------------------------

Test Suites: 14 passed, 14 total
Tests:       146 passed, 146 total
```

* **Typecheck**: `tsc --noEmit` passed with 0 errors.
* **Lint**: `eslint .` passed with 0 errors, 0 warnings.
* **Coverage**: **94.83% statements, 94.9% lines, 99.23% functions** across the tested codebase.

---

## 4. Known Issues & Open Questions
* None. All requirements for Milestone 5 have been fulfilled and verified.

---

## 5. Next Steps
* Await human approval before opening PR for Milestone 5 and proceeding to **Milestone 6: Add / Edit rule form**.
