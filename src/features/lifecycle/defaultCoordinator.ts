import { AppLifecycleCoordinator } from './AppLifecycleCoordinator';
import { getDefaultRulesController } from '@/features/rules/defaultRepositories';
import { getDefaultPermissionsController } from '@/features/permissions/defaultAdapter';
import { getDefaultEnforcementController } from '@/features/enforcement/defaultRepositories';
import { SystemClock } from '@/domain/time';

let instance: AppLifecycleCoordinator | null = null;

export function getDefaultAppLifecycleCoordinator(): AppLifecycleCoordinator {
  if (!instance) {
    instance = new AppLifecycleCoordinator(
      getDefaultRulesController(),
      getDefaultPermissionsController(),
      getDefaultEnforcementController(),
      new SystemClock()
    );
  }
  return instance;
}

export function setAppLifecycleCoordinatorInstance(
  coordinator: AppLifecycleCoordinator | null
): void {
  instance = coordinator;
}
