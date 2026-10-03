# Calm Self: Project Spec and Milestones

Build specification for an AI coding agent. Android only, React Native (Expo), fully offline, free.

## 1. How to use this document
This is the single source of truth for the project. Work through the milestones in order. Finish one, verify it against its checklist, write the milestone report, and stop and wait for human approval before starting the next. Never start a milestone early, and never merge two milestones into one change.

## 2. Product summary
Calm Self lets a person write messages to their future tempted self. When they open an app they want to use less, a full-screen overlay shows one of their messages, makes them wait a few seconds, and, once their daily limit for that app is used up, locks the app for a set time.

### Core concept: Rules
A Rule is a bundle of settings shared by one or more apps:
- one or more messages (one is shown at random each time)
- a daily time limit
- a continue delay (seconds before the Continue button works)
- a block duration (how long the app stays locked after the limit is hit)
- a list of connected apps

Usage and lock state belong to each app, not to the rule. If a rule covers Instagram, YouTube and Reddit with a 30 minute limit, each app gets its own 30 minutes and its own lock. Instagram hitting the limit never affects YouTube.

### Home screen
A list of Rule cards, plus an Add button. Each card shows:
- the message (first one, truncated; "+N more" if several)
- a summary line: limit, delay, lock duration
- an ON/OFF switch
- connected app icons with today's usage per app (for example 12/30 min) and a lock marker for locked apps
- an Edit button and a Delete button

### Business rules (decided, do not change without approval)
1. One app belongs to at most one rule. The form must prevent or clearly resolve conflicts.
2. Daily usage resets at local midnight. Usage is computed for "today" so the rollover is automatic.
3. Tightening applies instantly. Loosening applies from the next local midnight.
   - Tightening: lower limit, longer delay, longer block, adding an app, turning a rule ON.
   - Loosening: higher limit, shorter delay, shorter block, removing an app, turning a rule OFF, deleting a rule.
   - A pending loosening change is shown on the card (for example "Turning off tomorrow") with an Undo action.
   - An edit that mixes both kinds is split: tightening parts apply now, loosening parts become pending.
4. Delete asks for confirmation.
5. No backend, no account, no network use. All data stays on the device.

### Non-goals (for now)
iOS, photos in messages, usage statistics screens, cloud sync, accounts, analytics, monetization.

## 3. Rules for the coding agent
These apply to every task.
1. Read the official documentation before using any library, API or platform feature. Use the docs for the exact version installed in the project. Official sources: the Expo docs (docs.expo.dev), the React Native docs (reactnative.dev), the EAS docs (docs.expo.dev/eas), the Android developer docs (developer.android.com), and each library's own README and repository.
2. Do not assume. Do not invent APIs. If a function name, option or behavior is not confirmed by the docs or by the library's source code, do not use it. Stop and report what you could not confirm.
3. Record the source. For each external API you rely on, leave a short comment or ADR entry with the documentation URL you used.
4. Pin versions. Install the latest stable versions that are mutually compatible according to the Expo SDK documentation, and record them in docs/adr/0001-stack.md. Do not guess version numbers from memory.
5. Ask before deviating. If a decision in this document turns out to be impossible or wrong, stop and write down the problem and the options. Do not silently change the design.
6. After every task, run typecheck, lint and tests. Do not continue with failing checks.
7. One milestone per branch and per pull request, with conventional commit messages.
8. At the end of each milestone, produce docs/milestones/Mx-report.md containing: what was built, how each checklist item was verified, known issues, and open questions. Then stop.

## 4. Technology
### Decided:
- React Native with Expo, TypeScript in strict mode.
- Development build with `expo-dev-client`, built with EAS. Expo Go is not usable for this project because it needs native modules that Expo Go does not contain.
- Android only.
- No backend. Local on-device storage.

### To be decided from documentation (record each decision as an ADR):
- The library that detects foreground apps and draws the overlay. First candidate to evaluate: `expo-blocker` (package: `expo-app-blocker`). It has not been verified. Milestone 0 decides whether it is usable.
- How rule configuration reaches the native watcher. The watcher can run when the JavaScript app is not in the foreground, so the library's documentation must show how configuration is passed to or stored on the native side. Do not assume AsyncStorage is readable by native code.
- Which local storage library the JavaScript side uses (compare AsyncStorage, MMKV and expo-sqlite against the Expo and library docs; choose the simplest that fits).
- Navigation: follow the routing approach the current Expo documentation recommends for new projects.
- Validation library, if any (for example zod). Optional. Justify it in an ADR or do without.

## 5. Architecture and coding principles
### Layers
```
UI (screens, components)
  depends on
Feature logic (hooks, stores, services)
  depends on
Domain (pure TypeScript: rules, time, decisions) <- no React, no native imports
  used by
Data (storage adapter, repositories) and Platform (blocker adapter)
```
- Domain contains all business rules as pure functions with injected time. It must run in plain Node tests.
- Platform is the only place allowed to import the blocker/usage library. Everything else talks to a small interface we own, so the library can be swapped without touching the rest of the app.
- Data hides the storage library behind a repository interface.
- UI contains no business logic. Screens are thin and compose feature components.

### Principles
- Strict TypeScript. No `any`. No non-null assertions without a comment explaining why.
- Dependency injection for the clock, storage and blocker, so everything is testable.
- Never read the current time directly inside domain logic. Pass `now` in.
- Typed results for expected failures (permission denied, storage error). Throw only for programmer errors.
- No magic numbers. Defaults and limits live in `src/config/constants.ts`.
- Small, single-purpose functions and files. Names describe intent. Comments explain why, not what.
- Persisted data carries a schema version and has migrations from day one.
- Accessibility labels on every interactive element. Support dark mode and large font sizes.
- Never log message text or any personal content.

## 6. Folder structure
```
calm-self/
├─ app/                         # Routes only. Thin screens.
│  ├─ _layout.tsx
│  ├─ index.tsx                 # Home
│  ├─ onboarding/permissions.tsx
│  └─ rule/
│     ├─ new.tsx
│     └─ [id].tsx
├─ src/
│  ├─ domain/                   # Pure TypeScript, fully unit tested
│  │  ├─ types.ts
│  │  ├─ ruleEngine.ts          # Decides: allow / show message / lock
│  │  ├─ changePolicy.ts        # Tightening vs loosening, pending changes
│  │  ├─ time.ts                # Midnight boundaries, clock interface
│  │  └─ validation.ts
│  ├─ data/
│  │  ├─ storage/               # Storage adapter interface + implementation
│  │  ├─ repositories/          # RuleRepository, AppStateRepository
│  │  └─ migrations/
│  ├─ platform/
│  │  └─ blocker/               # Our interface + the one adapter for the library
│  ├─ features/
│  │  ├─ rules/                 # components, hooks, store
│  │  ├─ permissions/
│  │  └─ enforcement/           # Syncs rules to the watcher, handles events
│  ├─ ui/                       # Shared components, theme tokens
│  ├─ lib/                      # logger, result type, id generation
│  └─ config/constants.ts
├─ modules/                     # Only if a custom native module is required
├─ docs/
│  ├─ SPEC.md                   # This document
│  ├─ adr/                      # Architecture decision records
│  ├─ milestones/               # Mx-report.md files
│  └─ spike-report.md
├─ __tests__/                   # Mirrors src/ (or tests colocated; pick one, document it)
└─ README.md
```

## 7. Data model
```typescript
Rule {
  id, messages[], limitMinutes, delaySeconds, blockMinutes,
  appIds[], enabled, pendingChange?, schemaVersion
}

PendingChange { patch, effectiveAt } // effectiveAt = next local midnight

AppState {
  appId (package name), ruleId, usedTodaySeconds, usageDate, lockedUntil?
}
```

## 8. Milestones summary
- Milestone 0: Feasibility spike (go / no-go)
- Milestone 1: Project scaffold and tooling
- Milestone 2: Domain layer (pure logic)
- Milestone 3: Data layer
- Milestone 4: Permissions and onboarding
- Milestone 5: Home screen and Rule card
- Milestone 6: Add / Edit rule form
- Milestone 7: Enforcement integration
- Milestone 8: Reliability and edge cases
- Milestone 9: Polish and release
