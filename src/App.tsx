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
import { NAV_ITEMS, type NavItemId } from './navigation';

export default function App() {
  const [activePage, setActivePage] = useState<NavItemId>('dashboard');
  const [defectDraft, setDefectDraft] =
    useState<DefectFormValues | null>(null);
  const [executionContext, setExecutionContext] =
    useState<DefectExecutionContext | null>(null);
  const [testCaseNavigationFilter, setTestCaseNavigationFilter] =
    useState<DashboardTestCaseFilter | null>(null);
  const [defectNavigationFilters, setDefectNavigationFilters] =
    useState<Partial<DefectFilters>>({});
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activePage);

  function handleNavigate(page: NavItemId) {
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

  function openDefectDraft(draft: DefectFormValues) {
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
        return <ProjectsPage />;
      case 'testCases':
        return (
          <TestCasesPage
            initialProjectId={testCaseNavigationFilter?.projectId}
            initialScenarioId={testCaseNavigationFilter?.scenarioId}
            initialStatusFilter={testCaseNavigationFilter?.status}
          />
        );
      case 'testExecution':
        return (
          <TestExecutionPage
            initialContext={executionContext}
            onCreateDefect={openDefectDraft}
          />
        );
      case 'defects':
        return (
          <DefectsPage
            initialDraft={defectDraft}
            initialFilters={defectNavigationFilters}
            onDraftConsumed={() => setDefectDraft(null)}
            onViewExecution={openLinkedExecution}
          />
        );
      case 'reports':
        return <ReportsPage />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          activePage={activePage}
          navItems={NAV_ITEMS}
          onNavigate={handleNavigate}
        />
        <main
          aria-labelledby="page-title"
          className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-medium text-teal-700">
              Enhanced Dashboard and Reports
            </p>
            <h2
              id="page-title"
              className="mt-2 text-3xl font-semibold tracking-normal text-slate-950"
            >
              {activeNavItem?.label}
            </h2>
            <div className="mt-6">{renderPage()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
