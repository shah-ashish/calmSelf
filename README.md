# Calm Self

> A mindful, offline-first digital wellbeing intervention application for Android built with React Native and Expo. Calm Self lets you write personal intervention messages to your future tempted self, enforces mindful pauses before opening protected apps, and locks apps when daily limits are reached.

---

## Key Features

* **🌱 Mindful Interventions**: Display personal mindful reminders and positive reflections written by your past self whenever a protected app is opened.
* **⏳ Pause Delay Countdown**: Enforces a customizable reflective countdown (e.g. 10 seconds) before the *Continue* button activates, breaking compulsive muscle-memory app opening.
* **🔒 Independent Per-App Limits & Cooldowns**: Set daily time limits and cooldown lock durations per rule. Limits and locks belong strictly to each app independently (e.g. reaching Instagram's limit never affects YouTube).
* **⚖️ Asymmetric Change Policy**:
  * **Tightening applies instantly**: Lowering daily limits, increasing pause delay, lengthening block durations, adding apps, or enabling rules takes effect immediately.
  * **Loosening applies at next midnight**: Raising limits, reducing delay, shortening lock duration, removing apps, disabling rules, or deleting rules is staged as a pending change effective at the next local midnight, with an instant **Undo** option to prevent impulsive override.
* **🛡️ Self-Healing Enforcement & Watchdog**: Automatically resynchronizes rules with the Android native blocker, monitors background service health, drains OS intercepts, and performs automatic midnight usage resets.
* **🔒 100% Private & Offline**: Zero network calls, zero analytics, zero accounts, zero third-party cloud backends. All data stays strictly on your device.

---

## Architecture Overview

Calm Self strictly enforces a clean, layered architecture:

```
UI Layer (app/, src/ui/)
  ↓
Feature Logic (src/features/)
  ↓
Domain Layer (src/domain/)  ← Pure TypeScript, zero React or Native imports
  ↓
Data Layer (src/data/) & Platform Layer (src/platform/)
```

* **Domain Layer (`src/domain/`)**: Pure functions with dependency injection for time and clock. Zero React or React Native dependencies. 100% testable in plain Node.
* **Platform Layer (`src/platform/blocker/`)**: Isolates the native Android blocker interface (`BlockerAdapter`) from the rest of the application.
* **Data Layer (`src/data/`)**: Repository pattern abstracting local persistence (`RuleRepository`, `AppStateRepository`) with schema migration runner.
* **Feature Layer (`src/features/`)**: Feature controllers and reactive hooks (`rules`, `permissions`, `enforcement`, `lifecycle`).
* **UI Layer (`app/`, `src/ui/`)**: Positive, soothing aesthetic with smooth shadows, generous border radii (`radii.xl`), gentle pastel accents, and accessible design tokens.

---

## Getting Started (Fresh Clone Setup)

### Prerequisites
* **Node.js**: v20 or v22
* **npm**: v10+
* **EAS CLI**: (optional, for cloud builds) `npm install -g eas-cli`

### Installation
```bash
# Clone the repository
git clone https://github.com/shah-ashish/calmSelf.git
cd calmSelf

# Install dependencies (utilizes SDK 57 compatible versions)
npm install
```

---

## Development & Testing Scripts

```bash
# Start local Metro dev server
npm start

# Run TypeScript typecheck (strict mode)
npm run typecheck

# Run ESLint across entire codebase
npm run lint

# Run full Jest unit test suite with coverage
npm test -- --coverage

# Format code with Prettier
npm run format
```

---

## Building for Android Device

Because Calm Self relies on native Android foreground services (`UsageStatsManager` and `SYSTEM_ALERT_WINDOW`), it runs in a development or production build rather than Expo Go.

### Cloud Build with EAS
```bash
# Log in to your Expo account
npx eas login

# Build development APK in EAS cloud
npx eas build --profile development --platform android

# Build standalone preview APK
npx eas build --profile preview --platform android

# Build release App Bundle (AAB) for Google Play
npx eas build --profile production --platform android
```

---

## Project Documentation & Milestones

* **Specification**: [`docs/SPEC.md`](docs/SPEC.md)
* **Milestone Reports**:
  * [M0: Feasibility Spike](docs/milestones/M0-report.md)
  * [M1: Project Scaffold & Tooling](docs/milestones/M1-report.md)
  * [M2: Pure Domain Logic](docs/milestones/M2-report.md)
  * [M3: Data & Storage Layer](docs/milestones/M3-report.md)
  * [M4: Permissions Onboarding](docs/milestones/M4-report.md)
  * [M5: Home Screen & Rule Cards](docs/milestones/M5-report.md)
  * [M6: Rule Form & Validation](docs/milestones/M6-report.md)
  * [M7: Enforcement Integration](docs/milestones/M7-report.md)
  * [M8: Reliability & Edge Cases](docs/milestones/M8-report.md)
  * [M9: Polish & Release](docs/milestones/M9-report.md)
* **Architectural Decisions**:
  * [0001: Technology Stack](docs/adr/0001-stack.md)
  * [0002: Local Storage Strategy](docs/adr/0002-local-storage.md)
