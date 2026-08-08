export const USER_ROLES = [
  'Admin',
  'QA Lead',
  'Tester',
  'Developer',
  'Viewer',
] as const;

export const USER_STATUSES = ['Active', 'Inactive'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdDate: string;
  updatedDate: string;
};

export type UserFormValues = Pick<
  User,
  'firstName' | 'lastName' | 'email' | 'role' | 'status'
>;

export type UserFormErrors = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  protection: string | null;
};

export type UserReference = {
  userId: string;
  displayName: string;
};

export type AuditedRecord = {
  createdBy?: UserReference;
  updatedBy?: UserReference;
};

export const FIRST_NAME_REQUIRED_ERROR = 'First Name is required.';
export const LAST_NAME_REQUIRED_ERROR = 'Last Name is required.';
export const EMAIL_REQUIRED_ERROR = 'Email is required.';
export const EMAIL_INVALID_ERROR = 'Enter a valid email address.';
export const EMAIL_DUPLICATE_ERROR = 'A user with this email already exists.';
export const LAST_ACTIVE_ADMIN_ERROR =
  'TestNest must keep at least one Active Admin.';
export const LEGACY_USER_LABEL = 'Legacy Record';

export function getDisplayName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function normalizeUserValues(values: UserFormValues): UserFormValues {
  return {
    ...values,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLocaleLowerCase(),
  };
}

export function getUserFormErrors(
  values: UserFormValues,
  users: readonly User[],
  excludedUserId?: string,
): UserFormErrors {
  const normalized = normalizeUserValues(values);
  let emailError: string | null = null;

  if (!normalized.email) {
    emailError = EMAIL_REQUIRED_ERROR;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    emailError = EMAIL_INVALID_ERROR;
  } else if (
    users.some(
      (user) =>
        user.id !== excludedUserId &&
        user.email.trim().toLocaleLowerCase() === normalized.email,
    )
  ) {
    emailError = EMAIL_DUPLICATE_ERROR;
  }

  return {
    firstName: normalized.firstName ? null : FIRST_NAME_REQUIRED_ERROR,
    lastName: normalized.lastName ? null : LAST_NAME_REQUIRED_ERROR,
    email: emailError,
    protection: null,
  };
}

export function hasUserFormErrors(errors: UserFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function createUser(
  values: UserFormValues,
  options: { id?: string; now?: string } = {},
): User {
  const normalized = normalizeUserValues(values);
  const now = options.now ?? new Date().toISOString();

  return {
    id: options.id ?? crypto.randomUUID(),
    ...normalized,
    displayName: getDisplayName(normalized.firstName, normalized.lastName),
    createdDate: now,
    updatedDate: now,
  };
}

export function updateUser(
  user: User,
  values: UserFormValues,
  now = new Date().toISOString(),
): User {
  const normalized = normalizeUserValues(values);

  return {
    ...user,
    ...normalized,
    displayName: getDisplayName(normalized.firstName, normalized.lastName),
    updatedDate: now,
  };
}

export function getLastActiveAdminError(
  users: readonly User[],
  userId: string,
  nextRole: UserRole,
  nextStatus: UserStatus,
) {
  const user = users.find((candidate) => candidate.id === userId);

  if (!user || user.role !== 'Admin' || user.status !== 'Active') {
    return null;
  }

  const activeAdminCount = users.filter(
    (candidate) =>
      candidate.role === 'Admin' && candidate.status === 'Active',
  ).length;
  const remainsActiveAdmin = nextRole === 'Admin' && nextStatus === 'Active';

  return activeAdminCount === 1 && !remainsActiveAdmin
    ? LAST_ACTIVE_ADMIN_ERROR
    : null;
}

export function getActiveUsers(users: readonly User[]) {
  return users.filter((user) => user.status === 'Active');
}

export function createUserReference(user: User): UserReference {
  return { userId: user.id, displayName: user.displayName };
}

export function getUserReferenceLabel(reference?: UserReference) {
  return reference?.displayName || LEGACY_USER_LABEL;
}

export function assignCreatedAudit<T extends object>(record: T, user: User) {
  const reference = createUserReference(user);
  return { ...record, createdBy: reference, updatedBy: reference };
}

export function assignUpdatedAudit<T extends object>(record: T, user: User) {
  return { ...record, updatedBy: createUserReference(user) };
}

export function assignExecutedBy<T extends object>(record: T, user: User) {
  return { ...record, executedBy: createUserReference(user) };
}

export function getDefaultReporter(user: User) {
  return createUserReference(user);
}

export function getAssignableUsers(users: readonly User[]) {
  return getActiveUsers(users);
}
