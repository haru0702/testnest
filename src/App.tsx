import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import type { DefectExecutionContext } from './components/DefectDetails';
import type { DefectFilters, DefectFormValues } from './defects/defect';
import {
  DashboardPage,
  type DashboardTestCaseFilter,
} from './pages/DashboardPage';
import { DefectsPage } from './pages/DefectsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReportsPage } from './pages/ReportsPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { TestExecutionPage } from './pages/TestExecutionPage';
import { UsersPage } from './pages/UsersPage';
import { NAV_ITEMS, type NavItemId } from './navigation';
import { hasPermission, PERMISSION_DENIED_MESSAGE } from './users/permissions';
import type { User } from './users/user';
import {
  getInitialActiveUserId,
  loadUsers,
  saveActiveUserId,
  saveUsers,
} from './users/userStorage';

export default function App() {
  // Temporary local session simulation; replace this state with authenticated identity later.
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [activeUserId, setActiveUserId] = useState(() =>
    getInitialActiveUserId(loadUsers()),
  );
  const [activePage, setActivePage] = useState<NavItemId>('dashboard');
  const [permissionError, setPermissionError] = useState('');
  const [defectDraft, setDefectDraft] =
    useState<DefectFormValues | null>(null);
  const [executionContext, setExecutionContext] =
    useState<DefectExecutionContext | null>(null);
  const [testCaseNavigationFilter, setTestCaseNavigationFilter] =
    useState<DashboardTestCaseFilter | null>(null);
  const [defectNavigationFilters, setDefectNavigationFilters] =
    useState<Partial<DefectFilters>>({});
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activePage);
  const activeUser =
    users.find((user) => user.id === activeUserId && user.status === 'Active') ??
    users.find((user) => user.status === 'Active')!;
  const availableNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(activeUser, item.permission),
  );

  function handleNavigate(page: NavItemId) {
    const item = NAV_ITEMS.find((candidate) => candidate.id === page);
    if (!item || !hasPermission(activeUser, item.permission)) {
      setPermissionError(PERMISSION_DENIED_MESSAGE);
      return;
    }

    setPermissionError('');
    if (page === 'defects') {
      setDefectDraft(null);
      setDefectNavigationFilters({});
    }

    if (page === 'testExecution') {
      setExecutionContext(null);
    }

    if (page === 'testCases') {
      setTestCaseNavigationFilter(null);
    }

    setActivePage(page);
  }

  function handleSwitchUser(userId: string) {
    const nextUser = users.find(
      (user) => user.id === userId && user.status === 'Active',
    );
    if (!nextUser) {
      setPermissionError(PERMISSION_DENIED_MESSAGE);
      return;
    }

    setActiveUserId(nextUser.id);
    saveActiveUserId(nextUser.id);
    const currentPage = NAV_ITEMS.find((item) => item.id === activePage);
    if (!currentPage || !hasPermission(nextUser, currentPage.permission)) {
      setActivePage('dashboard');
      setPermissionError(PERMISSION_DENIED_MESSAGE);
    } else {
      setPermissionError('');
    }
  }

  function handleUsersChange(nextUsers: User[]) {
    saveUsers(nextUsers);
    setUsers(nextUsers);
    const nextActiveUser =
      nextUsers.find(
        (user) => user.id === activeUserId && user.status === 'Active',
      ) ?? nextUsers.find((user) => user.status === 'Active');

    if (nextActiveUser && nextActiveUser.id !== activeUserId) {
      setActiveUserId(nextActiveUser.id);
      saveActiveUserId(nextActiveUser.id);
    }

    if (!nextActiveUser || !hasPermission(nextActiveUser, 'canManageUsers')) {
      setActivePage('dashboard');
      setPermissionError(PERMISSION_DENIED_MESSAGE);
    }
  }

  function openDefectDraft(draft: DefectFormValues) {
    if (!hasPermission(activeUser, 'canCreateDefects')) {
      setPermissionError(PERMISSION_DENIED_MESSAGE);
      return;
    }
    setDefectDraft(draft);
    setActivePage('defects');
  }

  function openLinkedExecution(context: DefectExecutionContext) {
    setExecutionContext(context);
    setActivePage('testExecution');
  }

  function openFilteredTestCases(filter: DashboardTestCaseFilter) {
    setTestCaseNavigationFilter(filter);
    setActivePage('testCases');
  }

  function openFilteredDefects(filters: Partial<DefectFilters>) {
    setDefectNavigationFilters(filters);
    setDefectDraft(null);
    setActivePage('defects');
  }

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onOpenTestCases={openFilteredTestCases}
            onOpenDefects={openFilteredDefects}
          />
        );
      case 'projects':
        return (
          <ProjectsPage
            activeUser={activeUser}
            onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)}
          />
        );
      case 'testCases':
        return (
          <TestCasesPage
            initialProjectId={testCaseNavigationFilter?.projectId}
            initialScenarioId={testCaseNavigationFilter?.scenarioId}
            initialStatusFilter={testCaseNavigationFilter?.status}
            activeUser={activeUser}
            onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)}
          />
        );
      case 'testExecution':
        return (
          <TestExecutionPage
            initialContext={executionContext}
            onCreateDefect={openDefectDraft}
            activeUser={activeUser}
            onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)}
          />
        );
      case 'defects':
        return (
          <DefectsPage
            initialDraft={defectDraft}
            initialFilters={defectNavigationFilters}
            onDraftConsumed={() => setDefectDraft(null)}
            onViewExecution={openLinkedExecution}
            users={users}
            activeUser={activeUser}
            onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)}
          />
        );
      case 'reports':
        return (
          <ReportsPage
            users={users}
            activeUser={activeUser}
            onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)}
          />
        );
      case 'users':
        return (
          <UsersPage
            users={users}
            activeUser={activeUser}
            onUsersChange={handleUsersChange}
            onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          activePage={activePage}
          navItems={availableNavItems}
          onNavigate={handleNavigate}
          users={users}
          activeUser={activeUser}
          onSwitchUser={handleSwitchUser}
        />
        <main
          aria-labelledby="page-title"
          className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-medium text-teal-700">
              Users, Roles, and Permissions
            </p>
            <h2
              id="page-title"
              className="mt-2 text-3xl font-semibold tracking-normal text-slate-950"
            >
              {activeNavItem?.label}
            </h2>
            {permissionError ? (
              <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                <span>{permissionError}</span>
                <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setPermissionError('')}>
                  Dismiss
                </button>
              </div>
            ) : null}
            <div className="mt-6">{renderPage()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
