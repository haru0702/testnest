import { describe, expect, it } from 'vitest';
import type { Defect } from '../defects/defect';
import {
  assignCreatedAudit,
  assignExecutedBy,
  assignUpdatedAudit,
  createUser,
  createUserReference,
  EMAIL_DUPLICATE_ERROR,
  EMAIL_INVALID_ERROR,
  getActiveUsers,
  getAssignableUsers,
  getDefaultReporter,
  getLastActiveAdminError,
  getUserFormErrors,
  getUserReferenceLabel,
  LAST_ACTIVE_ADMIN_ERROR,
  LEGACY_USER_LABEL,
  type User,
  type UserRole,
} from './user';
import { canEditDefect, hasPermission } from './permissions';
import {
  ACTIVE_USER_STORAGE_KEY,
  DEFAULT_ADMIN_ID,
  getInitialActiveUserId,
  loadUsers,
  USER_STORAGE_KEY,
} from './userStorage';

const now = '2026-08-08T00:00:00.000Z';

function makeUser(role: UserRole, overrides: Partial<User> = {}): User {
  return {
    id: role.toLocaleLowerCase().replace(' ', '-'),
    firstName: role,
    lastName: 'User',
    displayName: `${role} User`,
    email: `${role.toLocaleLowerCase().replace(' ', '.')}@testnest.local`,
    role,
    status: 'Active',
    createdDate: now,
    updatedDate: now,
    ...overrides,
  };
}

describe('role permissions', () => {
  it('gives Admin full access', () => {
    const user = makeUser('Admin');
    expect(hasPermission(user, 'canManageUsers')).toBe(true);
    expect(hasPermission(user, 'canDeleteProjects')).toBe(true);
    expect(hasPermission(user, 'canExportReports')).toBe(true);
  });

  it('allows QA Lead management without Users or Project deletion', () => {
    const user = makeUser('QA Lead');
    expect(hasPermission(user, 'canCreateProjects')).toBe(true);
    expect(hasPermission(user, 'canDeleteTestCases')).toBe(true);
    expect(hasPermission(user, 'canManageUsers')).toBe(false);
    expect(hasPermission(user, 'canDeleteProjects')).toBe(false);
  });

  it('allows Tester authoring and execution without administration', () => {
    const user = makeUser('Tester');
    expect(hasPermission(user, 'canCreateTestCases')).toBe(true);
    expect(hasPermission(user, 'canExecuteTests')).toBe(true);
    expect(hasPermission(user, 'canManageUsers')).toBe(false);
    expect(hasPermission(user, 'canDeleteScenarios')).toBe(false);
  });

  it('keeps Developer focused on viewing and assigned Defects', () => {
    const user = makeUser('Developer');
    expect(hasPermission(user, 'canViewDefects')).toBe(true);
    expect(hasPermission(user, 'canEditOwnDefects')).toBe(true);
    expect(hasPermission(user, 'canExecuteTests')).toBe(false);
    expect(hasPermission(user, 'canEditTestCases')).toBe(false);
  });

  it('makes Viewer read-only', () => {
    const user = makeUser('Viewer');
    expect(hasPermission(user, 'canViewDashboard')).toBe(true);
    expect(hasPermission(user, 'canViewReports')).toBe(true);
    expect(hasPermission(user, 'canCreateProjects')).toBe(false);
    expect(hasPermission(user, 'canCreateDefects')).toBe(false);
  });

  it('rejects permissions for inactive users', () => {
    expect(
      hasPermission(makeUser('Admin', { status: 'Inactive' }), 'canManageUsers'),
    ).toBe(false);
  });
});

describe('user validation and lifecycle', () => {
  it('creates and stores a default local Admin when no users exist', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    };
    const users = loadUsers(storage);
    expect(users[0]).toMatchObject({ id: DEFAULT_ADMIN_ID, role: 'Admin', status: 'Active' });
    expect(data.has(USER_STORAGE_KEY)).toBe(true);
  });

  it('ignores an inactive stored active user', () => {
    const admin = makeUser('Admin');
    const inactive = makeUser('Tester', { status: 'Inactive' });
    const storage = {
      getItem: (key: string) => key === ACTIVE_USER_STORAGE_KEY ? inactive.id : null,
    };
    expect(getInitialActiveUserId([admin, inactive], storage)).toBe(admin.id);
  });

  it('trims user values and normalizes email casing', () => {
    const user = createUser(
      {
        firstName: '  Mary ',
        lastName: ' QA  ',
        email: ' MARY.QA@EXAMPLE.COM ',
        role: 'Tester',
        status: 'Active',
      },
      { id: 'mary', now },
    );
    expect(user).toMatchObject({
      displayName: 'Mary QA',
      email: 'mary.qa@example.com',
    });
  });

  it('validates required names and email', () => {
    const errors = getUserFormErrors(
      { firstName: ' ', lastName: '', email: '', role: 'Tester', status: 'Active' },
      [],
    );
    expect(errors.firstName).toBe('First Name is required.');
    expect(errors.lastName).toBe('Last Name is required.');
    expect(errors.email).toBe('Email is required.');
  });

  it('validates email format', () => {
    const errors = getUserFormErrors(
      { firstName: 'Mary', lastName: 'QA', email: 'not-an-email', role: 'Tester', status: 'Active' },
      [],
    );
    expect(errors.email).toBe(EMAIL_INVALID_ERROR);
  });

  it('prevents duplicate emails case-insensitively', () => {
    const existing = makeUser('Tester', { email: 'mary@example.com' });
    const errors = getUserFormErrors(
      { firstName: 'Other', lastName: 'User', email: ' MARY@EXAMPLE.COM ', role: 'Viewer', status: 'Active' },
      [existing],
    );
    expect(errors.email).toBe(EMAIL_DUPLICATE_ERROR);
  });

  it('excludes inactive users from active and assignee choices', () => {
    const active = makeUser('Tester');
    const inactive = makeUser('Developer', { status: 'Inactive' });
    expect(getActiveUsers([active, inactive])).toEqual([active]);
    expect(getAssignableUsers([active, inactive])).toEqual([active]);
  });

  it('protects the last Active Admin from demotion or deactivation', () => {
    const admin = makeUser('Admin');
    expect(getLastActiveAdminError([admin], admin.id, 'Viewer', 'Active')).toBe(LAST_ACTIVE_ADMIN_ERROR);
    expect(getLastActiveAdminError([admin], admin.id, 'Admin', 'Inactive')).toBe(LAST_ACTIVE_ADMIN_ERROR);
  });

  it('allows an Admin change when another Active Admin remains', () => {
    const first = makeUser('Admin', { id: 'first' });
    const second = makeUser('Admin', { id: 'second' });
    expect(getLastActiveAdminError([first, second], first.id, 'Viewer', 'Inactive')).toBeNull();
  });
});

describe('audit and ownership helpers', () => {
  const user = makeUser('Tester');

  it('assigns Created By and Updated By snapshots', () => {
    expect(assignCreatedAudit({ id: 'record' }, user)).toMatchObject({
      createdBy: createUserReference(user),
      updatedBy: createUserReference(user),
    });
  });

  it('assigns Updated By without changing Created By', () => {
    const createdBy = { userId: 'original', displayName: 'Original User' };
    expect(assignUpdatedAudit({ createdBy }, user)).toMatchObject({
      createdBy,
      updatedBy: createUserReference(user),
    });
  });

  it('assigns Executed By and defaults Reporter to the current user', () => {
    expect(assignExecutedBy({ id: 'execution' }, user).executedBy).toEqual(createUserReference(user));
    expect(getDefaultReporter(user)).toEqual(createUserReference(user));
  });

  it('keeps legacy records readable', () => {
    expect(getUserReferenceLabel()).toBe(LEGACY_USER_LABEL);
  });

  it('limits Tester and Developer edits to their own Defects', () => {
    const defect = {
      assignee: createUserReference(user),
      assigneeName: user.displayName,
      reporterName: '',
    } as Defect;
    expect(canEditDefect(user, defect)).toBe(true);
    expect(canEditDefect(makeUser('Developer'), defect)).toBe(false);
  });
});
