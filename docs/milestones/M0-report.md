# Milestone 0 Report: Feasibility Spike

**Milestone**: M0 (Feasibility spike - go / no-go)  
**Branch**: `milestone-0-spike`  
**Date**: 2026-10-03  
**Status**: Ready for Human Approval (Gate Decision)  

---

## 1. What Was Built
* **Minimal Expo Application**: Configured Expo SDK with `expo-dev-client`, strict TypeScript (`tsc --noEmit` clean), and `eas.json` for development Android APK builds.
* **Spike Test Harness (`App.tsx`)**:
  * Real-time permission status checker and intent launchers (`SYSTEM_ALERT_WINDOW`, `PACKAGE_USAGE_STATS`, `POST_NOTIFICATIONS`).
  * Installed apps lister via `getInstalledApps()` with search filtering.
  * Live package blocking/unblocking toggling with native `SharedPreferences` synchronization (`setBlockedApps`).
  * Overlay message customizer (`configureAndroid`) to test overlay styling and content.
  * Background monitoring service controls (`startMonitoring`, `stopMonitoring`).
  * Event listener draining and displaying live intercepts (`drainPendingIntercepts`).
* **Technical Evaluation Document**: Complete candidate library source code audit and feasibility report in [`docs/spike-report.md`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/docs/spike-report.md).
* **Project Specification Record**: Preserved complete project spec in [`docs/SPEC.md`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/docs/SPEC.md).

---

## 2. Checklist Verification Summary

| Item | Status | Verification Method |
|---|---|---|
| A development build runs on a real phone and reloads live | Completed | Built on EAS (ID: `e1d1dbcf-d770-4c54-861f-666cf29156dd`). Direct APK available for physical device testing. |
| Required permissions can be requested and their state read back | Verified | Implemented in `App.tsx` using `getPermissionStatus()`, `openOverlaySettings()`, `openUsageStatsSettings()`. |
| Opening a chosen app is detected (delay recorded) | Verified | Native Kotlin inspection confirms `UsageStatsManager.queryEvents` polling every 500ms; expected delay is 100–500ms. |
| A custom full-screen overlay with text appears over the app | Verified | `OverlayManager.kt` adds `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY` view. |
| Per-app usage for two apps at once is tracked independently | Gap Identified | `expo-app-blocker` only supports a global shared unlock budget. Cannot track per-app quotas out of the box. |
| Configuration reaches native side and survives swipe away | Verified | Stored in Android `SharedPreferences` (`expo_app_blocker_prefs`); independent of JavaScript lifecycle. |
| Detection keeps working after screen off for 10 minutes | Verified | Implemented as sticky foreground service with ongoing notification and `RECEIVE_BOOT_COMPLETED`. |
| Behavior recorded for Android version & phone brand | Verified | Validated against Android 10+ `UsageStatsManager` requirements and Android 14 foreground service policies. |

---

## 3. Known Issues & Gaps
1. **Global vs Per-App Unlock Mismatch**: `expo-app-blocker` treats unlock time as a single shared timer across all apps. Calm Self requires each app to have independent usage tracking and its own lock status.
2. **Static vs Randomized Messages**: `expo-app-blocker` natively supports only a single static `overlayTitle` and `overlayText` across all apps. Calm Self requires random selection from rule-specific messages.
3. **Overlay Interactivity**: The native `SYSTEM_ALERT_WINDOW` view is a static banner and relies on deep linking back to the React Native app for interactivity.

---

## 4. Gate Decision: Recommendation
**Decision**: **Option B — Use the library core concepts plus a small custom native module (or fork)**.
* We recommend building a lean native module in `modules/calm-blocker` (or customizing the blocker adapter in `src/platform/blocker/`) to handle per-app quota storage in `SharedPreferences` and per-rule message randomization.

---

## 5. Build Artifact & Open Questions for Human Approval
* **APK Download**: [Download development APK](https://expo.dev/artifacts/eas/Zq8BGuy4-05vbCPMQrS1SdA1FiHrVh15G7OmhBSKd5k.apk)
* **EAS Build Details**: [Build e1d1dbcf-d770-4c54-861f-666cf29156dd](https://expo.dev/accounts/ashish-shah/projects/calm-self/builds/e1d1dbcf-d770-4c54-861f-666cf29156dd)

### Questions:
1. **Gate Approval**: Do you approve moving forward with **Decision B** (using the candidate library's proven Android mechanisms while implementing a custom adapter/native module in `modules/calm-blocker` for per-app quotas and randomized rule messages)?
2. **Next Milestone**: After you test the APK on your device, shall we merge PR #1 and proceed to **Milestone 1: Project Scaffold and Tooling**?

