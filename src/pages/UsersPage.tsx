import { useState } from 'react';
import { StatCard } from '../components/StatCard';
import {
  ClearFiltersButton,
  TableFilterSelect,
  TableNoResults,
  TablePagination,
  TableResultCount,
  TableSearchField,
  TableToolbar,
} from '../components/TableControls';
import { UserForm } from '../components/UserForm';
import { UserTable, type UserSortKey } from '../components/UserTable';
import {
  compareDates,
  compareText,
  getNextSortDirection,
  matchesSearch,
  paginateItems,
  sortItems,
  type SortDirection,
} from '../table/tableUtils';
import {
  createUser,
  getLastActiveAdminError,
  getUserFormErrors,
  hasUserFormErrors,
  updateUser,
  USER_ROLES,
  USER_STATUSES,
  type User,
  type UserFormErrors,
  type UserFormValues,
  type UserRole,
  type UserStatus,
} from '../users/user';
import { hasPermission, PERMISSION_DENIED_MESSAGE } from '../users/permissions';

type UsersPageProps = {
  users: User[];
  activeUser: User;
  onUsersChange: (users: User[]) => void;
  onPermissionDenied: () => void;
};

type FormMode = 'create' | 'edit' | null;

const EMPTY_FORM_ERRORS: UserFormErrors = {
  firstName: null,
  lastName: null,
  email: null,
  protection: null,
};

export function UsersPage({
  users,
  activeUser,
  onUsersChange,
  onPermissionDenied,
}: UsersPageProps) {
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [sortKey, setSortKey] = useState<UserSortKey>('updatedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      matchesSearch(searchQuery, [user.displayName, user.email]) &&
      (roleFilter === 'all' || user.role === roleFilter) &&
      (statusFilter === 'all' || user.status === statusFilter),
  );
  const sortedUsers = sortItems(
    filteredUsers,
    (first, second) => {
      if (sortKey === 'createdDate' || sortKey === 'updatedDate') {
        return compareDates(first[sortKey], second[sortKey]);
      }
      return compareText(first[sortKey], second[sortKey]);
    },
    sortDirection,
  );
  const paginatedUsers = paginateItems(sortedUsers, page);

  function guardPermission() {
    if (hasPermission(activeUser, 'canManageUsers')) {
      return true;
    }
    setActionError(PERMISSION_DENIED_MESSAGE);
    onPermissionDenied();
    return false;
  }

  function closeForm() {
    setFormMode(null);
    setEditingUser(null);
    setActionError('');
  }

  function openCreateForm() {
    if (!guardPermission()) return;
    setEditingUser(null);
    setFormMode('create');
  }

  function openEditForm(user: User) {
    if (!guardPermission()) return;
    setEditingUser(user);
    setFormMode('edit');
  }

  function handleSubmit(values: UserFormValues): UserFormErrors {
    if (!guardPermission()) {
      return { ...EMPTY_FORM_ERRORS, protection: PERMISSION_DENIED_MESSAGE };
    }

    const validationErrors = getUserFormErrors(values, users, editingUser?.id);
    if (hasUserFormErrors(validationErrors)) return validationErrors;

    if (editingUser) {
      const protection = getLastActiveAdminError(
        users,
        editingUser.id,
        values.role,
        values.status,
      );
      if (protection) return { ...EMPTY_FORM_ERRORS, protection };
    }

    const nextUsers = editingUser
      ? users.map((user) =>
          user.id === editingUser.id ? updateUser(user, values) : user,
        )
      : [...users, createUser(values)];
    onUsersChange(nextUsers);
    closeForm();
    return EMPTY_FORM_ERRORS;
  }

  function toggleStatus(user: User) {
    if (!guardPermission()) return;
    const status: UserStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const protection = getLastActiveAdminError(users, user.id, user.role, status);
    if (protection) {
      setActionError(protection);
      return;
    }
    const nextUsers = users.map((candidate) =>
      candidate.id === user.id
        ? updateUser(candidate, { ...candidate, status })
        : candidate,
    );
    onUsersChange(nextUsers);
    setActionError('');
  }

  function clearFilters() {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSortKey('updatedDate');
    setSortDirection('descending');
    setPage(1);
  }

  function handleSort(nextKey: UserSortKey) {
    setSortDirection(getNextSortDirection(sortKey, nextKey, sortDirection));
    setSortKey(nextKey);
    setPage(1);
  }

  const activeCount = users.filter((user) => user.status === 'Active').length;
  const adminCount = users.filter((user) => user.role === 'Admin').length;

  return (
    <section aria-label="User management">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Manage local TestNest users, roles, and account availability.
        </p>
        {formMode ? null : (
          <button type="button" className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700" onClick={openCreateForm}>
            Add User
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Users" value={users.length} tone="neutral" />
        <StatCard label="Active Users" value={activeCount} tone="success" />
        <StatCard label="Inactive Users" value={users.length - activeCount} tone="muted" />
        <StatCard label="Admins" value={adminCount} tone="neutral" />
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {actionError}
        </p>
      ) : null}

      <div className="mt-6">
        {formMode ? (
          <UserForm
            key={editingUser?.id ?? 'new-user'}
            user={editingUser ?? undefined}
            users={users}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        ) : (
          <>
            <TableToolbar>
              <TableSearchField id="user-search" label="Search users" placeholder="Search by name or email" value={searchQuery} onChange={(value) => { setSearchQuery(value); setPage(1); }} />
              <TableFilterSelect id="user-role-filter" label="Filter by Role" value={roleFilter} options={[{ value: 'all', label: 'All Roles' }, ...USER_ROLES.map((role) => ({ value: role, label: role }))]} onChange={(value) => { setRoleFilter(value as 'all' | UserRole); setPage(1); }} />
              <TableFilterSelect id="user-status-filter" label="Filter by Status" value={statusFilter} options={[{ value: 'all', label: 'All Statuses' }, ...USER_STATUSES.map((status) => ({ value: status, label: status }))]} onChange={(value) => { setStatusFilter(value as 'all' | UserStatus); setPage(1); }} />
              <ClearFiltersButton onClick={clearFilters} />
            </TableToolbar>
            <div className="my-3"><TableResultCount count={filteredUsers.length} /></div>
            {filteredUsers.length > 0 ? (
              <>
                <UserTable users={paginatedUsers.items} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} onEdit={openEditForm} onToggleStatus={toggleStatus} />
                <TablePagination page={paginatedUsers.page} totalPages={paginatedUsers.totalPages} onPageChange={setPage} />
              </>
            ) : (
              <TableNoResults itemName="users" onClear={clearFilters} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
