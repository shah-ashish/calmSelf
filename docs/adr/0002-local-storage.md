# 0002. Local On-Device Storage Strategy

* **Status**: Accepted
* **Date**: 2026-10-03
* **Deciders**: Ashish Shah & Antigravity Agent

---

## Context and Problem Statement
Section 4 and 5 of the project specification require:
1. Purely local on-device persistence for rules and app states with zero network use.
2. An architectural boundary where Data hides the storage library behind a repository interface (`StorageAdapter`).
3. Dependency injection for storage, enabling hermetic testing in plain Node without native hardware or mocks.
4. Schema versioning and migration runners from day one.
5. Evaluation of candidate libraries: `AsyncStorage`, `MMKV`, and `expo-sqlite`.

---

## Evaluation of Storage Candidates

| Candidate | Strengths | Weaknesses / Drawbacks | Verdict |
|---|---|---|---|
| **AsyncStorage** (`@react-native-async-storage/async-storage`) | Officially supported Expo package (`npx expo install`), clean Promise-based key-value API, minimal footprint, perfect match for small document models (rules list & app state map). | Asynchronous operations (though entirely non-blocking and ideal for React state workflows). | **Selected** |
| **MMKV** (`react-native-mmkv`) | Synchronous C++ JSI bindings, exceptionally high throughput for high-frequency writes. | Requires native JSI setup and binary linking; complex for a simple wellbeing app where writes occur infrequently (only on rule edits or state updates); unnecessary dependency overhead. | Rejected |
| **expo-sqlite** (`expo-sqlite`) | Full relational SQL database capabilities, ACID transactions. | Drastic overengineering for Calm Self data model; SQL tables and migrations introduce unnecessary schema boilerplate compared to JSON document persistence. | Rejected |

---

## Decision Outcome
We choose `@react-native-async-storage/async-storage` (v2.2.0) as the underlying native storage provider, abstracted strictly behind a clean `StorageAdapter` interface:

```typescript
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}
```

### Components Created:
1. `StorageAdapter`: Universal asynchronous key-value contract.
2. `AsyncStorageAdapter`: Production adapter delegating to `@react-native-async-storage/async-storage`.
3. `InMemoryStorageAdapter`: Pure in-memory adapter (`Map<string, string>`) for deterministic, sub-second Jest unit tests.
4. `RuleRepository`: CRUD operations for `Rule` objects, maintaining schema versioning and data validation.
5. `AppStateRepository`: Per-app state persistence (`usedTodaySeconds`, `usageDate`, `lockedUntil`).
6. `MigrationRunner`: Versioned schema migration runner supporting sequential schema evolution (e.g. v1 -> v2) with error recovery and rollback safeguards.

---

## Consequences

### Positive
* **Decoupled Architecture**: High-level repositories never import `@react-native-async-storage/async-storage` directly, allowing the underlying engine to be changed with zero impact on repositories or domain services.
* **Hermetic Node Testing**: All repository logic, migration workflows, and corruption handling tests run hermetically in Jest without mocking native modules.
* **Corrupted Record Resilience**: Repositories detect corrupt JSON payloads gracefully, recovering or isolating bad records without app crashes.
* **Strict Privacy**: No user message contents or usage data ever leave the device.

### Negative / Trade-offs
* AsyncStorage stores data as strings, requiring JSON serialization and deserialization. Because Calm Self stores fewer than 50 rules and app states, this CPU overhead is negligible (<1ms).

---

## Confirmation & Documentation Links
* Expo AsyncStorage Guide: [https://docs.expo.dev/versions/latest/sdk/async-storage/](https://docs.expo.dev/versions/latest/sdk/async-storage/)
* React Native AsyncStorage Docs: [https://react-native-async-storage.github.io/async-storage/](https://react-native-async-storage.github.io/async-storage/)
* Calm Self Architecture Specification: [`docs/SPEC.md`](file:///C:/Users/ashis/OneDrive/Desktop/APP/calmSelf/docs/SPEC.md)
