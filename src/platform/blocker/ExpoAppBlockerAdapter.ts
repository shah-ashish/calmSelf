import {
  getPermissionStatus,
  openOverlaySettings,
  openUsageStatsSettings,
  getInstalledApps as getNativeInstalledApps,
  setBlockedApps,
  startMonitoring,
  stopMonitoring,
  configureAndroid,
  drainPendingIntercepts,
  temporaryUnlock as nativeTemporaryUnlock,
} from 'expo-app-blocker';
import type {
  BlockerAdapter,
  InstalledAppInfo,
  PermissionState,
  OverlayConfig,
  InterceptEvent,
} from './interface';
import { logger } from '@/lib/logger';

/**
 * Production implementation of BlockerAdapter delegating to expo-app-blocker.
 * This is the ONLY file allowed to import expo-app-blocker.
 */
export class ExpoAppBlockerAdapter implements BlockerAdapter {
  async checkPermissions(): Promise<PermissionState> {
    try {
      const status = await getPermissionStatus();
      if (status.details && status.details.platform === 'android') {
        return {
          overlayGranted: Boolean(status.details.overlay),
          usageAccessGranted: Boolean(status.details.usageStats),
          notificationsGranted: Boolean(status.details.notifications),
        };
      }
      return {
        overlayGranted: Boolean(status.allGranted),
        usageAccessGranted: Boolean(status.allGranted),
        notificationsGranted: true,
      };
    } catch (error) {
      logger.error('Failed to read permission status from native blocker module', error);
      return {
        overlayGranted: false,
        usageAccessGranted: false,
        notificationsGranted: false,
      };
    }
  }

  openOverlaySettings(): void {
    try {
      openOverlaySettings();
    } catch (error) {
      logger.error('Failed to open overlay settings', error);
    }
  }

  openUsageAccessSettings(): void {
    try {
      openUsageStatsSettings();
    } catch (error) {
      logger.error('Failed to open usage access settings', error);
    }
  }

  async getInstalledApps(): Promise<readonly InstalledAppInfo[]> {
    try {
      const apps = await getNativeInstalledApps();
      return apps.map((app) => ({
        packageName: app.packageName,
        name: app.name,
        iconBase64: app.iconBase64 ?? null,
      }));
    } catch (error) {
      logger.error('Failed to fetch installed apps from native module', error);
      return [];
    }
  }

  async setBlockedPackages(packages: readonly string[]): Promise<void> {
    try {
      setBlockedApps([...packages]);
    } catch (error) {
      logger.error('Failed to configure blocked packages on native module', error);
    }
  }

  async configureOverlay(config: OverlayConfig): Promise<void> {
    try {
      configureAndroid({
        overlayTitle: config.title,
        overlayText: config.text,
        overlayBackgroundColor: config.backgroundColor,
      });
    } catch (error) {
      logger.error('Failed to configure Android overlay', error);
    }
  }

  async drainPendingIntercepts(): Promise<readonly InterceptEvent[]> {
    try {
      const pending = drainPendingIntercepts();
      return pending.map((item) => ({
        appName: item.appName,
        interceptedAt: item.interceptedAt,
      }));
    } catch (error) {
      logger.error('Failed to drain pending intercepts from native module', error);
      return [];
    }
  }

  async startService(): Promise<void> {
    try {
      startMonitoring();
    } catch (error) {
      logger.error('Failed to start native background monitoring service', error);
    }
  }

  async stopService(): Promise<void> {
    try {
      stopMonitoring();
    } catch (error) {
      logger.error('Failed to stop native background monitoring service', error);
    }
  }

  async temporaryUnlock(durationMinutes: number): Promise<void> {
    try {
      await nativeTemporaryUnlock(Math.max(1, durationMinutes));
    } catch (error) {
      logger.error('Failed to grant temporary unlock to native blocker', error);
    }
  }
}
