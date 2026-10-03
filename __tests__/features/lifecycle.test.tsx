import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AppLifecycleCoordinator } from '@/features/lifecycle/AppLifecycleCoordinator';
import { useAppLifecycle } from '@/features/lifecycle/useAppLifecycle';
import { RulesController } from '@/features/rules/RulesController';
import { PermissionsController } from '@/features/permissions/PermissionsController';
import { EnforcementController } from '@/features/enforcement/EnforcementController';
import { RuleRepository } from '@/data/repositories/RuleRepository';
import { AppStateRepository } from '@/data/repositories/AppStateRepository';
import { InMemoryStorageAdapter } from '@/data/storage/InMemoryStorageAdapter';
import { MockBlockerAdapter } from '@/platform/blocker/MockBlockerAdapter';
import { MockClock } from '@/domain/time';

const mockAddEventListener = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (event: string, callback: (state: string) => void) =>
      mockAddEventListener(event, callback),
  },
}));

jest.mock('expo-app-blocker', () => ({
  __esModule: true,
  getPermissionStatus: jest.fn(async () => ({
    allGranted: true,
    details: { platform: 'android', overlay: true, usageStats: true, notifications: true },
  })),
  openOverlaySettings: jest.fn(),
  openUsageStatsSettings: jest.fn(),
  getInstalledApps: jest.fn(async () => []),
  setBlockedApps: jest.fn(),
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
}));

describe('AppLifecycleCoordinator & useAppLifecycle', () => {
  let storage: InMemoryStorageAdapter;
  let ruleRepo: RuleRepository;
  let appStateRepo: AppStateRepository;
  let blocker: MockBlockerAdapter;
  let clock: MockClock;
  let rulesController: RulesController;
  let permissionsController: PermissionsController;
  let enforcementController: EnforcementController;
  let coordinator: AppLifecycleCoordinator;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    ruleRepo = new RuleRepository(storage);
    appStateRepo = new AppStateRepository(storage);
    blocker = new MockBlockerAdapter();
    clock = new MockClock(new Date('2026-10-04T10:00:00.000Z').getTime());

    rulesController = new RulesController(ruleRepo, appStateRepo, clock);
    permissionsController = new PermissionsController(blocker);
    enforcementController = new EnforcementController(ruleRepo, appStateRepo, blocker, clock);
    coordinator = new AppLifecycleCoordinator(
      rulesController,
      permissionsController,
      enforcementController,
      clock
    );
  });

  describe('AppLifecycleCoordinator', () => {
    it('initializes by running active transition', async () => {
      const permsSpy = jest.spyOn(permissionsController, 'handleAppStateChange');
      const rulesSpy = jest.spyOn(rulesController, 'load');
      const watchdogSpy = jest.spyOn(enforcementController, 'healthCheck');

      const result = await coordinator.initialize();

      expect(coordinator.getCurrentAppState()).toBe('active');
      expect(permsSpy).toHaveBeenCalledWith('active');
      expect(rulesSpy).toHaveBeenCalled();
      expect(watchdogSpy).toHaveBeenCalled();
      expect(result.appState).toBe('active');
      expect(result.midnightRolloverChecked).toBe(true);
      expect(result.permissionsChecked).toBe(true);
      expect(result.healthCheck).not.toBeNull();
    });

    it('handles background transition by updating state without running active syncs', async () => {
      const permsSpy = jest.spyOn(permissionsController, 'handleAppStateChange');
      const rulesSpy = jest.spyOn(rulesController, 'load');
      const watchdogSpy = jest.spyOn(enforcementController, 'healthCheck');

      const result = await coordinator.handleAppStateChange('background');

      expect(coordinator.getCurrentAppState()).toBe('background');
      expect(permsSpy).not.toHaveBeenCalled();
      expect(rulesSpy).not.toHaveBeenCalled();
      expect(watchdogSpy).not.toHaveBeenCalled();
      expect(result.appState).toBe('background');
      expect(result.midnightRolloverChecked).toBe(false);
      expect(result.permissionsChecked).toBe(false);
      expect(result.healthCheck).toBeNull();
    });

    it('triggers rollover and watchdog when transitioning from background to active', async () => {
      await coordinator.handleAppStateChange('background');

      const permsSpy = jest.spyOn(permissionsController, 'handleAppStateChange');
      const rulesSpy = jest.spyOn(rulesController, 'load');
      const watchdogSpy = jest.spyOn(enforcementController, 'healthCheck');

      const result = await coordinator.handleAppStateChange('active');

      expect(coordinator.getCurrentAppState()).toBe('active');
      expect(permsSpy).toHaveBeenCalledWith('active');
      expect(rulesSpy).toHaveBeenCalled();
      expect(watchdogSpy).toHaveBeenCalled();
      expect(result.appState).toBe('active');
      expect(result.midnightRolloverChecked).toBe(true);
    });

    it('notifies subscribers on state transitions and handles listener errors gracefully', async () => {
      const listener = jest.fn();
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      const unsubscribe1 = coordinator.subscribe(listener);
      const unsubscribe2 = coordinator.subscribe(errorListener);

      await coordinator.handleAppStateChange('active');

      expect(listener).toHaveBeenCalled();
      expect(errorListener).toHaveBeenCalled();

      // Clean up subscriptions
      unsubscribe1();
      unsubscribe2();

      listener.mockClear();
      await coordinator.handleAppStateChange('background');
      expect(listener).not.toHaveBeenCalled();
    });

    it('handles controller failures without throwing errors', async () => {
      jest.spyOn(permissionsController, 'handleAppStateChange').mockRejectedValueOnce(new Error('Perm error'));
      jest.spyOn(rulesController, 'load').mockRejectedValueOnce(new Error('Rules error'));
      jest.spyOn(enforcementController, 'healthCheck').mockRejectedValueOnce(new Error('Watchdog error'));

      const result = await coordinator.handleAppStateChange('active');

      expect(result.appState).toBe('active');
      expect(result.permissionsChecked).toBe(false);
      expect(result.midnightRolloverChecked).toBe(false);
      expect(result.healthCheck).toBeNull();
    });
  });

  describe('useAppLifecycle hook', () => {
    function LifecycleTestComponent({ coord }: { coord: AppLifecycleCoordinator }) {
      useAppLifecycle(coord);
      return null;
    }

    it('initializes coordinator on mount and registers AppState change listener', async () => {
      const initSpy = jest.spyOn(coordinator, 'initialize').mockResolvedValue({
        appState: 'active',
        midnightRolloverChecked: true,
        permissionsChecked: true,
        healthCheck: null,
      });

      let appStateCallback: ((state: string) => void) | null = null;
      const removeSubscription = jest.fn();

      mockAddEventListener.mockImplementation((_event: string, callback: (state: string) => void) => {
        appStateCallback = callback;
        return { remove: removeSubscription };
      });

      let renderer: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = ReactTestRenderer.create(<LifecycleTestComponent coord={coordinator} />);
      });

      expect(initSpy).toHaveBeenCalled();
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // Simulate AppState transition event
      const handleStateSpy = jest.spyOn(coordinator, 'handleAppStateChange').mockResolvedValue({
        appState: 'active',
        midnightRolloverChecked: true,
        permissionsChecked: true,
        healthCheck: null,
      });

      if (appStateCallback) {
        await act(async () => {
          (appStateCallback as unknown as (state: string) => void)('active');
        });
        expect(handleStateSpy).toHaveBeenCalledWith('active');
      }

      await act(async () => {
        renderer.unmount();
      });

      expect(removeSubscription).toHaveBeenCalled();
    });
  });
});
