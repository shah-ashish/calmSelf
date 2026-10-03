import { ExpoAppBlockerAdapter } from '@/platform/blocker/ExpoAppBlockerAdapter';
import type { BlockerAdapter } from '@/platform/blocker/interface';
import { PermissionsController } from './PermissionsController';

let instance: BlockerAdapter | null = null;

export function getDefaultBlockerAdapter(): BlockerAdapter {
  if (!instance) {
    instance = new ExpoAppBlockerAdapter();
  }
  return instance;
}

/** For test environment overrides */
export function setBlockerAdapterInstance(adapter: BlockerAdapter | null): void {
  instance = adapter;
}

let permissionsControllerInstance: PermissionsController | null = null;

export function getDefaultPermissionsController(): PermissionsController {
  if (!permissionsControllerInstance) {
    permissionsControllerInstance = new PermissionsController(getDefaultBlockerAdapter());
  }
  return permissionsControllerInstance;
}

export function setPermissionsControllerInstance(
  controller: PermissionsController | null
): void {
  permissionsControllerInstance = controller;
}
