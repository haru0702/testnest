import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import type { DefectExecutionContext } from './components/DefectDetails';
import type { DefectFormValues } from './defects/defect';
import { DashboardPage } from './pages/DashboardPage';
import { DefectsPage } from './pages/DefectsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { TestExecutionPage } from './pages/TestExecutionPage';
import { NAV_ITEMS, type NavItemId } from './navigation';

export default function App() {
  const [activePage, setActivePage] = useState<NavItemId>('dashboard');
  const [defectDraft, setDefectDraft] =
    useState<DefectFormValues | null>(null);
  const [executionContext, setExecutionContext] =
    useState<DefectExecutionContext | null>(null);
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activePage);

  function handleNavigate(page: NavItemId) {
    if (page === 'defects') {
      setDefectDraft(null);
    }

    if (page === 'testExecution') {
      setExecutionContext(null);
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

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'testCases':
        return <TestCasesPage />;
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
            onDraftConsumed={() => setDefectDraft(null)}
            onViewExecution={openLinkedExecution}
          />
        );
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
              Defect Management
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
