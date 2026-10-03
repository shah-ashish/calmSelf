export type PermissionType = 'overlay' | 'usageAccess';

export interface PermissionExplanation {
  readonly type: PermissionType;
  readonly title: string;
  readonly shortDescription: string;
  readonly whyNeeded: string;
  readonly isGranted: boolean;
}
