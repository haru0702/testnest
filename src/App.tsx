import { useEffect, useMemo, useState } from 'react';
import type { AuthDependencies, AuthSession, AuthState } from './auth/auth';
import { resolveAuthState } from './auth/auth';
import { getAuthDependencies } from './auth/authDependencies';
import { formatSafeError } from './auth/authError';
import { Sidebar } from './components/Sidebar';
import type { DefectExecutionContext } from './components/DefectDetails';
import type { DefectFilters, DefectFormValues } from './defects/defect';
import { NAV_ITEMS, type NavItemId } from './navigation';
import {
  DashboardPage,
  type DashboardTestCaseFilter,
} from './pages/DashboardPage';
import { DefectsPage } from './pages/DefectsPage';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReportsPage } from './pages/ReportsPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { TestExecutionPage } from './pages/TestExecutionPage';
import { UsersPage } from './pages/UsersPage';
import { hasPermission, PERMISSION_DENIED_MESSAGE } from './users/permissions';
import type { User } from './users/user';
import { loadUsers, saveUsers } from './users/userStorage';

type AppProps = {
  authDependencies?: AuthDependencies;
};

type DependencyResult =
  | { dependencies: AuthDependencies; error?: never }
  | { dependencies?: never; error: string };

function getDependencyResult(override?: AuthDependencies): DependencyResult {
  if (override) return { dependencies: override };

  try {
    return { dependencies: getAuthDependencies() };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Authentication could not be initialized.',
    };
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return formatSafeError(error, fallbackMessage, {
    includeCategory: import.meta.env.DEV && !(error instanceof Error),
    sensitiveValues: [
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ],
  });
}

export default function App({ authDependencies }: AppProps) {
  const dependencyResult = useMemo(
    () => getDependencyResult(authDependencies),
    [authDependencies],
  );
  const [authState, setAuthState] = useState<AuthState>(
    dependencyResult.error
      ? { status: 'unavailable', message: dependencyResult.error }
      : { status: 'loading' },
  );

  useEffect(() => {
    const dependencies = dependencyResult.dependencies;
    if (!dependencies) return;
    const { authService, profileRepository } = dependencies;

    let isCurrent = true;

    async function applySession(session: AuthSession | null) {
      try {
        const nextState = await resolveAuthState(
          session,
          profileRepository,
        );
        if (isCurrent) setAuthState(nextState);
      } catch (error) {
        if (isCurrent) {
          setAuthState({
            status: 'unavailable',
            message: getErrorMessage(error, 'Your TestNest profile could not be loaded.'),
          });
        }
      }
    }

    const unsubscribe = authService.onAuthStateChange((session) => {
      window.setTimeout(() => void applySession(session), 0);
    });

    authService
      .getSession()
      .then(applySession)
      .catch((error: unknown) => {
        if (isCurrent) {
          setAuthState({
            status: 'unavailable',
            message: getErrorMessage(
              error,
              'The authentication session could not be checked.',
            ),
          });
        }
      });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [dependencyResult]);

  async function handleSignIn(email: string, password: string) {
    const dependencies = dependencyResult.dependencies;
    if (!dependencies) return;

    let session: AuthSession;

    try {
      session = await dependencies.authService.signInWithPassword(
        email,
        password,
      );
    } catch (error) {
      setAuthState({
        status: 'unauthenticated',
        error: getErrorMessage(error, 'Sign in could not be completed.'),
      });
      return;
    }

    setAuthState({ status: 'loading' });

    try {
      setAuthState(
        await resolveAuthState(session, dependencies.profileRepository),
      );
    } catch (error) {
      setAuthState({
        status: 'unavailable',
        message: getErrorMessage(
          error,
          'You are signed in, but your TestNest profile could not be loaded.',
        ),
      });
    }
  }

  async function handleLogout() {
    const dependencies = dependencyResult.dependencies;
    if (!dependencies) return;

    try {
      await dependencies.authService.signOut();
      setAuthState({ status: 'unauthenticated' });
    } catch (error) {
      setAuthState({
        status: 'unauthenticated',
        error: getErrorMessage(error, 'Sign out could not be completed.'),
      });
    }
  }

  if (authState.status === 'loading') {
    return <AuthLoading />;
  }

  if (authState.status === 'unavailable') {
    return <AuthUnavailable message={authState.message} />;
  }

  if (authState.status === 'unauthenticated') {
    return <LoginPage error={authState.error} onSignIn={handleSignIn} />;
  }

  if (authState.status === 'inactive') {
    return (
      <AccessBlocked
        title="Account inactive"
        message="Your TestNest profile is inactive. Contact an administrator to restore access."
        email={authState.session.user.email}
        onLogout={handleLogout}
      />
    );
  }

  if (authState.status === 'missing-profile') {
    return (
      <AccessBlocked
        title="Profile not found"
        message="Your sign-in is valid, but no TestNest profile is linked to this account. Contact an administrator."
        email={authState.session.user.email}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AuthenticatedApp activeUser={authState.profile} onLogout={handleLogout} />
  );
}

function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <p role="status" className="text-sm font-medium text-slate-700">
        Checking your TestNest session...
      </p>
    </main>
  );
}

function AuthUnavailable({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <section aria-labelledby="auth-error-title" className="w-full max-w-lg rounded-md border border-rose-200 bg-white p-6 shadow-sm">
        <h1 id="auth-error-title" className="text-2xl font-semibold text-slate-950">
          Authentication unavailable
        </h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-rose-800">
          {message}
        </p>
      </section>
    </main>
  );
}

type AccessBlockedProps = {
  title: string;
  message: string;
  email: string;
  onLogout: () => Promise<void>;
};

function AccessBlocked({ title, message, email, onLogout }: AccessBlockedProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <section aria-labelledby="access-title" className="w-full max-w-lg rounded-md border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">TestNest</p>
        <h1 id="access-title" className="mt-1 text-2xl font-semibold text-slate-950">
          {title}
        </h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-slate-700">{message}</p>
        <p className="mt-2 text-sm text-slate-500">Signed in as {email}</p>
        <button type="button" onClick={() => void onLogout()} className="mt-5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          Sign Out
        </button>
      </section>
    </main>
  );
}

type AuthenticatedAppProps = {
  activeUser: User;
  onLogout: () => Promise<void>;
};

function AuthenticatedApp({ activeUser, onLogout }: AuthenticatedAppProps) {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [activePage, setActivePage] = useState<NavItemId>('dashboard');
  const [permissionError, setPermissionError] = useState('');
  const [defectDraft, setDefectDraft] = useState<DefectFormValues | null>(null);
  const [executionContext, setExecutionContext] =
    useState<DefectExecutionContext | null>(null);
  const [testCaseNavigationFilter, setTestCaseNavigationFilter] =
    useState<DashboardTestCaseFilter | null>(null);
  const [defectNavigationFilters, setDefectNavigationFilters] =
    useState<Partial<DefectFilters>>({});
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activePage);
  const availableNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(activeUser, item.permission),
  );
  const directoryUsers = users.some((user) => user.id === activeUser.id)
    ? users
    : [...users, activeUser];

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
    if (page === 'testExecution') setExecutionContext(null);
    if (page === 'testCases') setTestCaseNavigationFilter(null);
    setActivePage(page);
  }

  function handleUsersChange(nextUsers: User[]) {
    saveUsers(nextUsers);
    setUsers(nextUsers);
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
        return <DashboardPage onOpenTestCases={openFilteredTestCases} onOpenDefects={openFilteredDefects} />;
      case 'projects':
        return <ProjectsPage activeUser={activeUser} onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)} />;
      case 'testCases':
        return <TestCasesPage initialProjectId={testCaseNavigationFilter?.projectId} initialScenarioId={testCaseNavigationFilter?.scenarioId} initialStatusFilter={testCaseNavigationFilter?.status} activeUser={activeUser} onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)} />;
      case 'testExecution':
        return <TestExecutionPage initialContext={executionContext} onCreateDefect={openDefectDraft} activeUser={activeUser} onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)} />;
      case 'defects':
        return <DefectsPage initialDraft={defectDraft} initialFilters={defectNavigationFilters} onDraftConsumed={() => setDefectDraft(null)} onViewExecution={openLinkedExecution} users={directoryUsers} activeUser={activeUser} onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)} />;
      case 'reports':
        return <ReportsPage users={directoryUsers} activeUser={activeUser} onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)} />;
      case 'users':
        return <UsersPage users={users} activeUser={activeUser} onUsersChange={handleUsersChange} onPermissionDenied={() => setPermissionError(PERMISSION_DENIED_MESSAGE)} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar activePage={activePage} navItems={availableNavItems} onNavigate={handleNavigate} activeUser={activeUser} onLogout={onLogout} />
        <main aria-labelledby="page-title" className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-medium text-teal-700">Supabase Authentication Foundation</p>
            <h2 id="page-title" className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              {activeNavItem?.label}
            </h2>
            {permissionError ? (
              <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                <span>{permissionError}</span>
                <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setPermissionError('')}>Dismiss</button>
              </div>
            ) : null}
            <div className="mt-6">{renderPage()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
