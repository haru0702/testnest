import type { SortDirection } from '../table/tableUtils';
import type { User } from '../users/user';
import { SortableTableHeader, TableHeader } from './TableControls';

export type UserSortKey =
  | 'displayName'
  | 'email'
  | 'role'
  | 'status'
  | 'createdDate'
  | 'updatedDate';

type UserTableProps = {
  users: User[];
  sortKey: UserSortKey;
  sortDirection: SortDirection;
  onSort: (key: UserSortKey) => void;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function UserTable({
  users,
  sortKey,
  sortDirection,
  onSort,
  onEdit,
  onToggleStatus,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200" aria-label="Users">
        <thead className="bg-slate-50">
          <tr>
            <SortableTableHeader label="Name" sortKey="displayName" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Email" sortKey="email" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Role" sortKey="role" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Created Date" sortKey="createdDate" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Updated Date" sortKey="updatedDate" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <TableHeader label="Actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {users.map((user) => (
            <tr key={user.id}>
              <th scope="row" className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold text-slate-950">
                {user.displayName}
              </th>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{user.email}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{user.role}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' : 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}>
                  {user.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{dateFormatter.format(new Date(user.createdDate))}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{dateFormatter.format(new Date(user.updatedDate))}</td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <div className="flex gap-2">
                  <button type="button" aria-label={`Edit ${user.displayName}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => onEdit(user)}>
                    Edit
                  </button>
                  <button type="button" aria-label={`${user.status === 'Active' ? 'Deactivate' : 'Activate'} ${user.displayName}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => onToggleStatus(user)}>
                    {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
