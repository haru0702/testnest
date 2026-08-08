import type { Permission } from './users/permissions';

export type NavItemId =
  | 'dashboard'
  | 'projects'
  | 'testCases'
  | 'testExecution'
  | 'defects'
  | 'reports'
  | 'users';

export type NavItem = {
  id: NavItemId;
  label: string;
  permission: Permission;
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', permission: 'canViewDashboard' },
  { id: 'projects', label: 'Projects', permission: 'canViewProjects' },
  { id: 'testCases', label: 'Test Cases', permission: 'canViewTestCases' },
  { id: 'testExecution', label: 'Test Execution', permission: 'canViewExecutionHistory' },
  { id: 'defects', label: 'Defects', permission: 'canViewDefects' },
  { id: 'reports', label: 'Reports', permission: 'canViewReports' },
  { id: 'users', label: 'Users', permission: 'canManageUsers' },
];
