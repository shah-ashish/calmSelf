/**
 * Schema Migration Interfaces.
 * Enables zero-downtime, deterministic data migrations from day one.
 */

export interface Migration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(rawData: unknown): Promise<unknown> | unknown;
}

export interface VersionedPayload {
  readonly schemaVersion: number;
  readonly [key: string]: unknown;
}
