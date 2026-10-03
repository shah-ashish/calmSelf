import type { BlockerAdapter, PermissionState } from '@/platform/blocker/interface';

export type PermissionChangeListener = (status: PermissionState) => void;

export class PermissionsController {
  private status: PermissionState = {
    overlayGranted: false,
    usageAccessGranted: false,
    notificationsGranted: false,
  };

  private readonly listeners = new Set<PermissionChangeListener>();

  constructor(private readonly adapter: BlockerAdapter) {}

  getStatus(): PermissionState {
    return { ...this.status };
  }

  isAllGranted(): boolean {
    return this.status.overlayGranted && this.status.usageAccessGranted;
  }

  async checkPermissions(): Promise<PermissionState> {
    const current = await this.adapter.checkPermissions();
    this.status = current;
    this.notify();
    return current;
  }

  requestOverlay(): void {
    this.adapter.openOverlaySettings();
  }

  requestUsageAccess(): void {
    this.adapter.openUsageAccessSettings();
  }

  /**
   * Called when AppState transitions (e.g. app returns to foreground).
   */
  async handleAppStateChange(nextAppState: string): Promise<void> {
    if (nextAppState === 'active') {
      await this.checkPermissions();
    }
  }

  subscribe(listener: PermissionChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getStatus();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
