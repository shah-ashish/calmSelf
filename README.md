# Calm Self

> A mindful, offline-first digital wellbeing application for Android built with React Native and Expo. Calm Self lets you write intervention messages to your future tempted self, enforces mindful pauses before opening protected apps, and locks apps when daily limits are reached.

---

## Architecture Overview

Calm Self strictly enforces a layered architecture:

```
UI Layer (app/, src/ui/)
  ↓
Feature Logic (src/features/)
  ↓
Domain Layer (src/domain/)  ← Pure TypeScript, zero React or Native imports
  ↓
Data Layer (src/data/) & Platform Layer (src/platform/)
```

* **Domain Layer (`src/domain/`)**: Pure functions with injected clock. Fully unit tested in plain Node.
* **Platform Layer (`src/platform/blocker/`)**: The only module allowed to interface with native Android background services.
* **Data Layer (`src/data/`)**: Repository pattern abstracting on-device storage.
* **UI Layer (`app/`, `src/ui/`)**: Positive, light-themed aesthetic with gentle colors, smooth elevations, and rounded radii.

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

# Install dependencies (utilizes .npmrc for clean peer resolution)
npm install
```

---

## Development Scripts

```bash
# Start local Metro dev server (for live reload on physical device)
npm start

# Run TypeScript typecheck (strict mode)
npm run typecheck

# Run ESLint (enforces architectural boundary rules)
npm run lint

# Run Jest unit test suite
npm test

# Format code with Prettier
npm run format
```

---

## Building for Android Device

Because Calm Self relies on native Android foreground services (`UsageStatsManager` and `SYSTEM_ALERT_WINDOW`), it runs in a development build rather than Expo Go.

### Option 1: Cloud Build with EAS (Recommended)
```bash
# Log in to your Expo account
npx eas login

# Build development APK in Expo cloud
npx eas build --profile development --platform android
```

### Option 2: Run Local Dev Server
Once the APK is installed on your physical device:
```bash
npx expo start
```
Select the running computer in the app's dev client screen to connect and test live changes.

---

## Architectural Decision Records (ADRs)
* [`docs/adr/0000-template.md`](docs/adr/0000-template.md): Template for recording architectural decisions.
* [`docs/adr/0001-stack.md`](docs/adr/0001-stack.md): Core technology stack, pinned versions, and architectural rationales.
* [`docs/spike-report.md`](docs/spike-report.md): Milestone 0 Feasibility Spike evaluation report.
