import {
  USER_ROLES,
  USER_STATUSES,
  type User,
  type UserRole,
  type UserStatus,
} from './user';

export const USER_STORAGE_KEY = 'testnest.users';
export const ACTIVE_USER_STORAGE_KEY = 'testnest.activeUserId';
export const DEFAULT_ADMIN_ID = 'testnest-local-admin';

type UserStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    isString(user.id) &&
    isString(user.firstName) &&
    isString(user.lastName) &&
    isString(user.displayName) &&
    isString(user.email) &&
    USER_ROLES.includes(user.role as UserRole) &&
    USER_STATUSES.includes(user.status as UserStatus) &&
    isString(user.createdDate) &&
    isString(user.updatedDate)
  );
}

export function createDefaultAdmin(now = new Date().toISOString()): User {
  return {
    id: DEFAULT_ADMIN_ID,
    firstName: 'TestNest',
    lastName: 'Admin',
    displayName: 'TestNest Admin',
    email: 'admin@testnest.local',
    role: 'Admin',
    status: 'Active',
    createdDate: now,
    updatedDate: now,
  };
}

export function saveUsers(
  users: readonly User[],
  storage: Pick<Storage, 'setItem'> = window.localStorage,
) {
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

export function loadUsers(
  storage: UserStorage = window.localStorage,
): User[] {
  try {
    const storedValue = storage.getItem(USER_STORAGE_KEY);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];
    const users = Array.isArray(parsedValue) ? parsedValue.filter(isUser) : [];

    if (users.length > 0) {
      return users;
    }
  } catch {
    // Invalid local development data falls back to a fresh local Admin.
  }

  const users = [createDefaultAdmin()];
  saveUsers(users, storage);
  return users;
}

export function getInitialActiveUserId(
  users: readonly User[],
  storage: Pick<Storage, 'getItem'> = window.localStorage,
) {
  const storedId = storage.getItem(ACTIVE_USER_STORAGE_KEY);
  const storedUser = users.find(
    (user) => user.id === storedId && user.status === 'Active',
  );

  return (
    storedUser ??
    users.find(
      (user) => user.role === 'Admin' && user.status === 'Active',
    ) ??
    users.find((user) => user.status === 'Active')
  )?.id ?? '';
}

export function saveActiveUserId(
  userId: string,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
) {
  storage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
}
