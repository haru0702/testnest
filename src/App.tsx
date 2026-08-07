import type { ReactElement } from 'react';
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NAV_ITEMS, type NavItemId } from './navigation';

const pageContent: Record<NavItemId, ReactElement> = {
  dashboard: <DashboardPage />,
  projects: (
    <PlaceholderPage
      title="Projects"
      description="Project management will be added in a later phase."
    />
  ),
  testCases: (
    <PlaceholderPage
      title="Test Cases"
      description="Test case authoring will be added in a later phase."
    />
  ),
  testExecution: (
    <PlaceholderPage
      title="Test Execution"
      description="Manual run tracking will be added in a later phase."
    />
  ),
};

export default function App() {
  const [activePage, setActivePage] = useState<NavItemId>('dashboard');
  const activeNavItem = NAV_ITEMS.find((item) => item.id === activePage);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar
          activePage={activePage}
          navItems={NAV_ITEMS}
          onNavigate={setActivePage}
        />
        <main
          aria-labelledby="page-title"
          className="flex-1 px-5 py-6 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-medium text-teal-700">
              Phase 1 Application Shell
            </p>
            <h2
              id="page-title"
              className="mt-2 text-3xl font-semibold tracking-normal text-slate-950"
            >
              {activeNavItem?.label}
            </h2>
            <div className="mt-6">{pageContent[activePage]}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
