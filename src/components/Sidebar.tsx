import type { NavItem, NavItemId } from '../navigation';

type SidebarProps = {
  activePage: NavItemId;
  navItems: NavItem[];
  onNavigate: (page: NavItemId) => void;
};

export function Sidebar({ activePage, navItems, onNavigate }: SidebarProps) {
  return (
    <aside
      aria-label="Main navigation"
      className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 text-white"
    >
      <div className="px-2">
        <h1 className="text-2xl font-semibold tracking-normal">TestNest</h1>
        <p className="mt-1 text-sm text-slate-300">QA Test Management</p>
      </div>

      <nav aria-label="Primary" className="mt-8">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === activePage;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    isActive
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white focus-visible:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
