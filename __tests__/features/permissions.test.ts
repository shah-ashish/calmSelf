import { PermissionsController } from '@/features/permissions/PermissionsController';
import { MockBlockerAdapter } from '@/platform/blocker/MockBlockerAdapter';

describe('PermissionsController (Status Checks, Revocation, Foreground Re-check)', () => {
  let adapter: MockBlockerAdapter;
  let controller: PermissionsController;

  beforeEach(() => {
    adapter = new MockBlockerAdapter();
    controller = new PermissionsController(adapter);
  });

  it('initializes with ungranted permissions state', () => {
    const status = controller.getStatus();
    expect(status.overlayGranted).toBe(false);
    expect(status.usageAccessGranted).toBe(false);
    expect(controller.isAllGranted()).toBe(false);
  });

  it('updates status and notifies listeners on checkPermissions', async () => {
    adapter.setOverlayPermission(true);

    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    const updated = await controller.checkPermissions();
    expect(updated.overlayGranted).toBe(true);
    expect(updated.usageAccessGranted).toBe(false);
    expect(controller.isAllGranted()).toBe(false);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayGranted: true,
        usageAccessGranted: false,
      })
    );

    unsubscribe();
  });

  it('correctly reports isAllGranted only when both overlay and usage access are granted', async () => {
    adapter.setOverlayPermission(true);
    adapter.setUsageAccessPermission(false);
    await controller.checkPermissions();
    expect(controller.isAllGranted()).toBe(false);

    adapter.setUsageAccessPermission(true);
    await controller.checkPermissions();
    expect(controller.isAllGranted()).toBe(true);
  });

  it('denying permission leaves state cleanly with isAllGranted false and allows retry', async () => {
    adapter.setAllPermissions(false);
    await controller.checkPermissions();

    expect(controller.isAllGranted()).toBe(false);
    expect(controller.getStatus().overlayGranted).toBe(false);
    expect(controller.getStatus().usageAccessGranted).toBe(false);

    // User can trigger settings request
    controller.requestOverlay();
    expect(adapter.openedOverlaySettingsCount).toBe(1);

    controller.requestUsageAccess();
    expect(adapter.openedUsageSettingsCount).toBe(1);
  });

  it('automatically re-checks permissions when returning to foreground (active)', async () => {
    adapter.setAllPermissions(false);
    await controller.checkPermissions();
    expect(controller.isAllGranted()).toBe(false);

    // User grants permissions while in system settings
    adapter.setAllPermissions(true);

    // App transitions from background to active
    await controller.handleAppStateChange('active');

    expect(controller.isAllGranted()).toBe(true);
    expect(controller.getStatus().overlayGranted).toBe(true);
    expect(controller.getStatus().usageAccessGranted).toBe(true);
  });

  it('ignores background or inactive state transitions without re-checking', async () => {
    const checkSpy = jest.spyOn(controller, 'checkPermissions');

    await controller.handleAppStateChange('background');
    expect(checkSpy).not.toHaveBeenCalled();

    await controller.handleAppStateChange('inactive');
    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('notices when permission is revoked in system settings after reopening app', async () => {
    // 1. Both permissions initially active
    adapter.setAllPermissions(true);
    await controller.checkPermissions();
    expect(controller.isAllGranted()).toBe(true);

    // 2. User goes to Android system settings and revokes usage access
    adapter.setUsageAccessPermission(false);

    // 3. User returns to app: AppState transitions to 'active'
    await controller.handleAppStateChange('active');

    // 4. Controller immediately reflects the revocation
    expect(controller.isAllGranted()).toBe(false);
    expect(controller.getStatus().overlayGranted).toBe(true);
    expect(controller.getStatus().usageAccessGranted).toBe(false);
  });

  it('properly unsubscribes listeners', async () => {
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    await controller.checkPermissions();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await controller.checkPermissions();
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });
});
