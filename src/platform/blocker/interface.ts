/**
 * Platform Blocker Adapter Interface.
 * Only implementations in this directory are allowed to import expo-app-blocker or native modules.
 */

export interface InstalledAppInfo {
  readonly packageName: string;
  readonly name: string;
  readonly iconBase64?: string | null;
}

export interface PermissionState {
  readonly overlayGranted: boolean;
  readonly usageAccessGranted: boolean;
  readonly notificationsGranted: boolean;
}

export interface InterceptEvent {
  readonly appName: string | null;
  readonly interceptedAt: number;
}

export interface OverlayConfig {
  readonly title?: string;
  readonly text?: string;
  readonly backgroundColor?: string;
}

export interface BlockerAdapter {
  checkPermissions(): Promise<PermissionState>;
  openOverlaySettings(): void;
  openUsageAccessSettings(): void;
  getInstalledApps(): Promise<readonly InstalledAppInfo[]>;
  setBlockedPackages(packages: readonly string[]): Promise<void>;
  configureOverlay(config: OverlayConfig): Promise<void>;
  drainPendingIntercepts(): Promise<readonly InterceptEvent[]>;
  startService(): Promise<void>;
  stopService(): Promise<void>;
  temporaryUnlock(durationMinutes: number): Promise<void>;
}
