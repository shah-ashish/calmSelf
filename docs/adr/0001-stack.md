# 0001. Core Technology Stack and Tooling

* **Status**: Accepted
* **Date**: 2026-10-03
* **Deciders**: Ashish Shah & Antigravity Agent

---

## Context and Problem Statement
Calm Self is an Android-only, offline, free digital wellbeing intervention application. It requires:
1. Long-lived foreground service monitoring (`UsageStatsManager`) capable of detecting target app transitions within ~500ms.
2. Interception overlay windows (`SYSTEM_ALERT_WINDOW`) displaying user-written intervention messages.
3. Completely local on-device persistence with zero backend or external network dependencies.
4. Independent per-app daily time tracking and asymmetric rule change policies (tightening applies immediately, loosening applies at midnight).
5. Clean, strict architecture where core business logic is isolated in a pure TypeScript domain layer testable in Node.

---

## Decision Outcome
Chosen Core Architecture and Pinned Stack:

| Package | Version | Justification / Role |
|---|---|---|
| `expo` | `~57.0.26` | Core Expo SDK runtime providing Continuous Native Generation (CNG) and config plugin support. |
| `react` | `19.2.3` | UI library runtime pinned by Expo SDK 57. |
| `react-native` | `0.86.3` | Mobile framework runtime pinned by Expo SDK 57. |
| `expo-router` | `~57.0.24` | Modern file-based routing recommended by current Expo documentation. |
| `expo-dev-client` | `^57.0.19` | Enables native development builds with live reloading, bypassing Expo Go native module limitations. |
| `typescript` | `~6.0.3` | Enforces strict compile-time checks (`noImplicitAny`, `strictNullChecks`, etc.). |
| `jest` / `ts-jest` | `^30.5.2` | Fast, isolated unit testing for domain layer running in plain Node environment. |
| `eslint` | `^9.20.0` | Static analysis enforcing code quality and architectural boundaries (e.g. banning React/native imports in `src/domain`). |
| `prettier` | `^3.9.9` | Automated, consistent code formatting. |
| `expo-app-blocker` | `^0.1.77` | Candidate native module providing proven Android foreground service and overlay primitives, to be wrapped or extended in `src/platform/blocker/`. |

---

## Consequences

### Positive
* **Rapid Live Reload**: Developers can modify code in `src/` or `app/` and see changes instantly on a physical device without rebuilding native binaries every time.
* **Hermetic Domain Logic**: Domain code has 0 dependencies on React or native APIs, allowing comprehensive, sub-second test execution.
* **Architectural Boundaries Enforced**: ESLint rule `no-restricted-imports` forbids React or native imports inside `src/domain/`.
* **Zero Backend Costs**: 100% on-device local execution guarantees privacy and zero server maintenance.

### Negative / Trade-offs
* Native builds require EAS or local Android SDK; Expo Go cannot be used because native foreground services are required.
* React 19 minor version peer dependencies require `legacy-peer-deps=true` in `.npmrc`.

---

## Confirmation & Documentation Links
* Expo SDK Documentation: [https://docs.expo.dev/](https://docs.expo.dev/)
* Expo Router Introduction: [https://docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/)
* EAS Build Reference: [https://docs.expo.dev/eas/index.md](https://docs.expo.dev/eas/index.md)
* Android UsageStatsManager Docs: [https://developer.android.com/reference/android/app/usage/UsageStatsManager](https://developer.android.com/reference/android/app/usage/UsageStatsManager)
