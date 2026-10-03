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

export interface BlockerAdapter {
  checkPermissions(): Promise<PermissionState>;
  openOverlaySettings(): void;
  openUsageAccessSettings(): void;
  getInstalledApps(): Promise<readonly InstalledAppInfo[]>;
  setBlockedPackages(packages: readonly string[]): Promise<void>;
  startService(): Promise<void>;
  stopService(): Promise<void>;
}
