import type { Defect } from '../defects/defect';
import type { User, UserRole } from './user';

export const PERMISSIONS = [
  'canManageUsers',
  'canViewDashboard',
  'canViewProjects',
  'canCreateProjects',
  'canEditProjects',
  'canDeleteProjects',
  'canViewTestCases',
  'canCreateScenarios',
  'canEditScenarios',
  'canDeleteScenarios',
  'canCreateTestCases',
  'canEditTestCases',
  'canDeleteTestCases',
  'canImportExportTestCases',
  'canExecuteTests',
  'canViewExecutionHistory',
  'canViewDefects',
  'canCreateDefects',
  'canEditAnyDefect',
  'canEditOwnDefects',
  'canDeleteDefects',
  'canManageDefectStatus',
  'canAssignDefects',
  'canViewReports',
  'canExportReports',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const VIEW_PERMISSIONS: Permission[] = [
  'canViewDashboard',
  'canViewProjects',
  'canViewTestCases',
  'canViewExecutionHistory',
  'canViewDefects',
  'canViewReports',
];

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  Admin: new Set(PERMISSIONS),
  'QA Lead': new Set([
    ...VIEW_PERMISSIONS,
    'canCreateProjects',
    'canEditProjects',
    'canCreateScenarios',
    'canEditScenarios',
    'canDeleteScenarios',
    'canCreateTestCases',
    'canEditTestCases',
    'canDeleteTestCases',
    'canImportExportTestCases',
    'canExecuteTests',
    'canCreateDefects',
    'canEditAnyDefect',
    'canManageDefectStatus',
    'canAssignDefects',
    'canExportReports',
  ]),
  Tester: new Set([
    ...VIEW_PERMISSIONS,
    'canCreateTestCases',
    'canEditTestCases',
    'canExecuteTests',
    'canCreateDefects',
    'canEditOwnDefects',
  ]),
  Developer: new Set([
    ...VIEW_PERMISSIONS,
    'canEditOwnDefects',
    'canManageDefectStatus',
  ]),
  Viewer: new Set(VIEW_PERMISSIONS),
};

export const PERMISSION_DENIED_MESSAGE =
  'You do not have permission to perform this action.';

export function hasPermission(
  user: User | null | undefined,
  permission: Permission,
) {
  return Boolean(
    user?.status === 'Active' && ROLE_PERMISSIONS[user.role].has(permission),
  );
}

export function canEditDefect(user: User, defect: Defect) {
  if (hasPermission(user, 'canEditAnyDefect')) {
    return true;
  }

  if (!hasPermission(user, 'canEditOwnDefects')) {
    return false;
  }

  return (
    defect.assignee?.userId === user.id ||
    defect.reporter?.userId === user.id ||
    defect.assigneeName === user.displayName ||
    defect.reporterName === user.displayName
  );
}

export function canDeleteDefect(user: User) {
  return hasPermission(user, 'canDeleteDefects');
}
