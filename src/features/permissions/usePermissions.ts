import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { BlockerAdapter, PermissionState } from '@/platform/blocker/interface';
import { getDefaultBlockerAdapter } from './defaultAdapter';
import { PermissionsController } from './PermissionsController';

export interface UsePermissionsResult {
  readonly status: PermissionState;
  readonly loading: boolean;
  readonly allGranted: boolean;
  readonly checkPermissions: () => Promise<PermissionState>;
  readonly requestOverlay: () => void;
  readonly requestUsageAccess: () => void;
}

export function usePermissions(
  adapter: BlockerAdapter = getDefaultBlockerAdapter()
): UsePermissionsResult {
  const controller = useMemo(() => new PermissionsController(adapter), [adapter]);
  const [status, setStatus] = useState<PermissionState>(controller.getStatus());
  const [loading, setLoading] = useState<boolean>(true);

  const checkPermissions = useCallback(async (): Promise<PermissionState> => {
    try {
      const current = await controller.checkPermissions();
      setStatus(current);
      return current;
    } finally {
      setLoading(false);
    }
  }, [controller]);

  // Initial check on mount & subscribe to controller updates
  useEffect(() => {
    checkPermissions();
    const unsubscribe = controller.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, [controller, checkPermissions]);

  // Re-check when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        controller.handleAppStateChange(nextAppState);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [controller]);

  const requestOverlay = useCallback(() => {
    controller.requestOverlay();
  }, [controller]);

  const requestUsageAccess = useCallback(() => {
    controller.requestUsageAccess();
  }, [controller]);

  return {
    status,
    loading,
    allGranted: status.overlayGranted && status.usageAccessGranted,
    checkPermissions,
    requestOverlay,
    requestUsageAccess,
  };
}
