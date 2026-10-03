/**
 * Core Domain Models & Interfaces
 * Pure TypeScript — ZERO React or Native imports.
 */

export interface Rule {
  readonly id: string;
  readonly messages: readonly string[];
  readonly limitMinutes: number;
  readonly delaySeconds: number;
  readonly blockMinutes: number;
  readonly appIds: readonly string[];
  readonly enabled: boolean;
  readonly pendingChange?: PendingChange;
  readonly schemaVersion: number;
}

export interface RulePatch {
  readonly messages?: readonly string[];
  readonly limitMinutes?: number;
  readonly delaySeconds?: number;
  readonly blockMinutes?: number;
  readonly appIds?: readonly string[];
  readonly enabled?: boolean;
}

export interface PendingChange {
  readonly patch: RulePatch;
  readonly effectiveAt: number; // Epoch ms of the next local midnight
}

export interface AppState {
  readonly appId: string; // Android package name
  readonly ruleId: string;
  readonly usedTodaySeconds: number;
  readonly usageDate: string; // YYYY-MM-DD in local time
  readonly lockedUntil?: number; // Epoch ms, if actively locked
}

export type EnforcementDecision =
  | { readonly type: 'allow' }
  | {
      readonly type: 'show_message';
      readonly message: string;
      readonly delaySeconds: number;
    }
  | {
      readonly type: 'lock';
      readonly lockedUntil: number;
    };

export interface Clock {
  now(): number;
  todayDateString(epochMs?: number): string;
  nextLocalMidnight(epochMs?: number): number;
}
