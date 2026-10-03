import type { BlockerAdapter, InstalledAppInfo, PermissionState } from './interface';

/**
 * Mock Blocker Adapter for Node & Jest tests and offline simulation.
 * Allows deterministic manipulation of permissions and installed apps.
 */
export class MockBlockerAdapter implements BlockerAdapter {
  public permissions: PermissionState = {
    overlayGranted: false,
    usageAccessGranted: false,
    notificationsGranted: true,
  };

  public installedApps: InstalledAppInfo[] = [
    { packageName: 'com.instagram.android', name: 'Instagram', iconBase64: null },
    { packageName: 'com.google.android.youtube', name: 'YouTube', iconBase64: null },
    { packageName: 'com.reddit.frontpage', name: 'Reddit', iconBase64: null },
  ];

  public blockedPackages: string[] = [];
  public serviceRunning: boolean = false;
  public openedOverlaySettingsCount: number = 0;
  public openedUsageSettingsCount: number = 0;

  async checkPermissions(): Promise<PermissionState> {
    return { ...this.permissions };
  }

  openOverlaySettings(): void {
    this.openedOverlaySettingsCount += 1;
  }

  openUsageAccessSettings(): void {
    this.openedUsageSettingsCount += 1;
  }

  async getInstalledApps(): Promise<readonly InstalledAppInfo[]> {
    return [...this.installedApps];
  }

  async setBlockedPackages(packages: readonly string[]): Promise<void> {
    this.blockedPackages = [...packages];
  }

  async startService(): Promise<void> {
    this.serviceRunning = true;
  }

  async stopService(): Promise<void> {
    this.serviceRunning = false;
  }

  // Test helper methods
  setOverlayPermission(granted: boolean): void {
    this.permissions = { ...this.permissions, overlayGranted: granted };
  }

  setUsageAccessPermission(granted: boolean): void {
    this.permissions = { ...this.permissions, usageAccessGranted: granted };
  }

  setAllPermissions(granted: boolean): void {
    this.permissions = {
      overlayGranted: granted,
      usageAccessGranted: granted,
      notificationsGranted: granted,
    };
  }
}
