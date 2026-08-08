import type { NavItem, NavItemId } from '../navigation';
import { getActiveUsers, type User } from '../users/user';

type SidebarProps = {
  activePage: NavItemId;
  navItems: NavItem[];
  onNavigate: (page: NavItemId) => void;
  users: User[];
  activeUser: User;
  onSwitchUser: (userId: string) => void;
};

export function Sidebar({ activePage, navItems, onNavigate, users, activeUser, onSwitchUser }: SidebarProps) {
  return (
    <aside
      aria-label="Main navigation"
      className="flex w-full shrink-0 flex-col border-slate-800 bg-slate-950 px-4 py-4 text-white md:min-h-screen md:w-64 md:border-r md:py-5"
    >
      <div className="px-2">
        <h1 className="text-2xl font-semibold tracking-normal">TestNest</h1>
        <p className="mt-1 text-sm text-slate-300">QA Test Management</p>
      </div>

      <nav aria-label="Primary" className="mt-4 md:mt-8">
        <ul className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === activePage;

            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition ${
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

      <div className="mt-4 border-t border-slate-700 px-2 pt-4 md:mt-auto">
        <label className="text-xs font-semibold uppercase text-slate-400" htmlFor="current-user">
          Current User
        </label>
        <select
          id="current-user"
          className="testnest-select mt-2 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-900"
          value={activeUser.id}
          onChange={(event) => onSwitchUser(event.target.value)}
        >
          {getActiveUsers(users).map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-400">
          {activeUser.role} - Local user simulation
        </p>
      </div>
    </aside>
  );
}
