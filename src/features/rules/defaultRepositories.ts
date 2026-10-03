import { AsyncStorageAdapter } from '@/data/storage/AsyncStorageAdapter';
import { RuleRepository as RuleRepoImpl } from '@/data/repositories/RuleRepository';
import { AppStateRepository as AppStateRepoImpl } from '@/data/repositories/AppStateRepository';
import type {
  RuleRepository,
  AppStateRepository,
} from '@/data/repositories/interfaces';

import { RulesController } from './RulesController';

let ruleRepoInstance: RuleRepository | null = null;
let appStateRepoInstance: AppStateRepository | null = null;
let rulesControllerInstance: RulesController | null = null;

export function getDefaultRuleRepository(): RuleRepository {
  if (!ruleRepoInstance) {
    const storage = new AsyncStorageAdapter();
    ruleRepoInstance = new RuleRepoImpl(storage);
  }
  return ruleRepoInstance;
}

export function getDefaultAppStateRepository(): AppStateRepository {
  if (!appStateRepoInstance) {
    const storage = new AsyncStorageAdapter();
    appStateRepoInstance = new AppStateRepoImpl(storage);
  }
  return appStateRepoInstance;
}

export function getDefaultRulesController(): RulesController {
  if (!rulesControllerInstance) {
    const ruleRepo = getDefaultRuleRepository();
    const appStateRepo = getDefaultAppStateRepository();
    rulesControllerInstance = new RulesController(ruleRepo, appStateRepo);
  }
  return rulesControllerInstance;
}

/** Injections for test environments */
export function setRuleRepositoryInstance(repo: RuleRepository | null): void {
  ruleRepoInstance = repo;
}

export function setAppStateRepositoryInstance(
  repo: AppStateRepository | null
): void {
  appStateRepoInstance = repo;
}

export function setRulesControllerInstance(
  controller: RulesController | null
): void {
  rulesControllerInstance = controller;
}

