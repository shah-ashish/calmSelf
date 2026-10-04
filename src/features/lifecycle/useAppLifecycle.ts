import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { AppLifecycleCoordinator } from './AppLifecycleCoordinator';
import { getDefaultAppLifecycleCoordinator } from './defaultCoordinator';

/**
 * Hook that connects React Native's AppState events to AppLifecycleCoordinator.
 * On mount and whenever the app transitions to 'active' (foreground),
 * it triggers midnight rollover, pending loosening changes, permission verification,
 * and watchdog health checks.
 */
export function useAppLifecycle(
  coordinator?: AppLifecycleCoordinator
): void {
  const coordinatorRef = useRef(coordinator ?? getDefaultAppLifecycleCoordinator());

  useEffect(() => {
    const activeCoordinator = coordinatorRef.current;

    // Run initial boot synchronization
    void activeCoordinator.initialize();

    // Listen for OS background -> foreground transitions
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      void activeCoordinator.handleAppStateChange(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
