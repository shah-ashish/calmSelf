import {
  getDefaultRuleRepository,
  getDefaultAppStateRepository,
  getDefaultRulesController,
} from '@/features/rules/defaultRepositories';
import { getDefaultBlockerAdapter } from '@/features/permissions/defaultAdapter';
import { SystemClock } from '@/domain/time';
import { EnforcementController } from './EnforcementController';

let enforcementControllerInstance: EnforcementController | null = null;

export function getDefaultEnforcementController(): EnforcementController {
  if (!enforcementControllerInstance) {
    const ruleRepo = getDefaultRuleRepository();
    const appStateRepo = getDefaultAppStateRepository();
    const blocker = getDefaultBlockerAdapter();
    const rulesController = getDefaultRulesController();
    enforcementControllerInstance = new EnforcementController(
      ruleRepo,
      appStateRepo,
      blocker,
      new SystemClock(),
      rulesController
    );
  }
  return enforcementControllerInstance;
}

/** Injections for test environments */
export function setEnforcementControllerInstance(
  controller: EnforcementController | null
): void {
  enforcementControllerInstance = controller;
}
