export const getPermissionStatus = jest.fn(async () => ({
  allGranted: true,
  details: {
    platform: 'android',
    overlay: true,
    usageStats: true,
    notifications: true,
  },
}));

export const openOverlaySettings = jest.fn();
export const openUsageStatsSettings = jest.fn();
export const getInstalledApps = jest.fn(async () => []);
export const setBlockedApps = jest.fn();
export const startMonitoring = jest.fn();
export const stopMonitoring = jest.fn();
export const configureAndroid = jest.fn();
export const drainPendingIntercepts = jest.fn(async () => []);
export const temporaryUnlock = jest.fn(async () => {});
