import { MockBlockerAdapter } from '@/platform/blocker/MockBlockerAdapter';
import { ExpoAppBlockerAdapter } from '@/platform/blocker/ExpoAppBlockerAdapter';
import * as nativeModule from 'expo-app-blocker';

jest.mock('expo-app-blocker', () => ({
  __esModule: true,
  getPermissionStatus: jest.fn(async () => ({
    allGranted: true,
    details: {
      platform: 'android',
      overlay: true,
      usageStats: true,
      notifications: true,
    },
  })),
  openOverlaySettings: jest.fn(),
  openUsageStatsSettings: jest.fn(),
  getInstalledApps: jest.fn(async () => [
    { packageName: 'com.test.app', name: 'Test App', iconBase64: 'data:image/png;base64,...' },
  ]),
  setBlockedApps: jest.fn(),
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
}));

describe('MockBlockerAdapter', () => {
  let adapter: MockBlockerAdapter;

  beforeEach(() => {
    adapter = new MockBlockerAdapter();
  });

  it('reports initial permission states', async () => {
    const status = await adapter.checkPermissions();
    expect(status.overlayGranted).toBe(false);
    expect(status.usageAccessGranted).toBe(false);
    expect(status.notificationsGranted).toBe(true);
  });

  it('updates permissions via test helper methods', async () => {
    adapter.setOverlayPermission(true);
    let status = await adapter.checkPermissions();
    expect(status.overlayGranted).toBe(true);
    expect(status.usageAccessGranted).toBe(false);

    adapter.setUsageAccessPermission(true);
    status = await adapter.checkPermissions();
    expect(status.usageAccessGranted).toBe(true);

    adapter.setAllPermissions(false);
    status = await adapter.checkPermissions();
    expect(status.overlayGranted).toBe(false);
    expect(status.usageAccessGranted).toBe(false);
  });

  it('tracks settings opening calls', () => {
    expect(adapter.openedOverlaySettingsCount).toBe(0);
    adapter.openOverlaySettings();
    expect(adapter.openedOverlaySettingsCount).toBe(1);

    expect(adapter.openedUsageSettingsCount).toBe(0);
    adapter.openUsageAccessSettings();
    expect(adapter.openedUsageSettingsCount).toBe(1);
  });

  it('returns installed apps and tracks blocked packages', async () => {
    const apps = await adapter.getInstalledApps();
    expect(apps.length).toBeGreaterThan(0);
    expect(apps[0].packageName).toBe('com.instagram.android');

    await adapter.setBlockedPackages(['com.instagram.android', 'com.google.android.youtube']);
    expect(adapter.blockedPackages).toEqual(['com.instagram.android', 'com.google.android.youtube']);
  });

  it('controls service lifecycle', async () => {
    expect(adapter.serviceRunning).toBe(false);
    await adapter.startService();
    expect(adapter.serviceRunning).toBe(true);
    await adapter.stopService();
    expect(adapter.serviceRunning).toBe(false);
  });
});

describe('ExpoAppBlockerAdapter', () => {
  let adapter: ExpoAppBlockerAdapter;

  beforeEach(() => {
    adapter = new ExpoAppBlockerAdapter();
    jest.clearAllMocks();
  });

  it('delegates checkPermissions to native module and formats response', async () => {
    const status = await adapter.checkPermissions();
    expect(status.overlayGranted).toBe(true);
    expect(status.usageAccessGranted).toBe(true);
    expect(status.notificationsGranted).toBe(true);
  });

  it('delegates settings navigation calls', () => {
    adapter.openOverlaySettings();
    expect(nativeModule.openOverlaySettings).toHaveBeenCalledTimes(1);

    adapter.openUsageAccessSettings();
    expect(nativeModule.openUsageStatsSettings).toHaveBeenCalledTimes(1);
  });

  it('fetches installed apps from native module', async () => {
    const apps = await adapter.getInstalledApps();
    expect(apps.length).toBe(1);
    expect(apps[0].packageName).toBe('com.test.app');
    expect(apps[0].name).toBe('Test App');
    expect(apps[0].iconBase64).toContain('base64');
  });

  it('delegates setBlockedPackages to native module', async () => {
    await adapter.setBlockedPackages(['com.test.app']);
    expect(nativeModule.setBlockedApps).toHaveBeenCalledWith(['com.test.app']);
  });

  it('delegates startService and stopService', async () => {
    await adapter.startService();
    expect(nativeModule.startMonitoring).toHaveBeenCalledTimes(1);

    await adapter.stopService();
    expect(nativeModule.stopMonitoring).toHaveBeenCalledTimes(1);
  });

  it('handles native module errors gracefully without throwing', async () => {
    jest.spyOn(nativeModule, 'getPermissionStatus').mockRejectedValueOnce(new Error('Native error'));
    const status = await adapter.checkPermissions();
    expect(status.overlayGranted).toBe(false);
    expect(status.usageAccessGranted).toBe(false);

    jest.spyOn(nativeModule, 'getInstalledApps').mockRejectedValueOnce(new Error('Native error'));
    const apps = await adapter.getInstalledApps();
    expect(apps).toEqual([]);
  });
});
