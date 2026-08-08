export type NavItemId =
  | 'dashboard'
  | 'projects'
  | 'testCases'
  | 'testExecution'
  | 'defects'
  | 'reports';

export type NavItem = {
  id: NavItemId;
  label: string;
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'testCases', label: 'Test Cases' },
  { id: 'testExecution', label: 'Test Execution' },
  { id: 'defects', label: 'Defects' },
  { id: 'reports', label: 'Reports' },
];
