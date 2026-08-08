import { expect, test, type Page } from '@playwright/test';

type Role = 'Admin' | 'QA Lead' | 'Tester' | 'Developer' | 'Viewer';
type Status = 'Active' | 'Inactive';

const date = '2026-08-01T00:00:00.000Z';

function makeUser(
  id: string,
  displayName: string,
  role: Role,
  status: Status = 'Active',
) {
  const [firstName, ...lastParts] = displayName.split(' ');
  return {
    id,
    firstName,
    lastName: lastParts.join(' ') || 'User',
    displayName,
    email: `${id}@testnest.local`,
    role,
    status,
    createdDate: date,
    updatedDate: date,
  };
}

const admin = makeUser('admin-user', 'Avery Admin', 'Admin');
const lead = makeUser('lead-user', 'Quinn Lead', 'QA Lead');
const tester = makeUser('tester-user', 'Taylor Tester', 'Tester');
const developer = makeUser('developer-user', 'Devon Developer', 'Developer');
const viewer = makeUser('viewer-user', 'Val Viewer', 'Viewer');
const inactive = makeUser('inactive-user', 'Ina Inactive', 'Tester', 'Inactive');

const project = {
  id: 'project-users',
  name: 'Identity Platform',
  description: 'User and role coverage.',
  status: 'Active',
  createdDate: date,
  updatedDate: date,
};

const scenario = {
  id: 'scenario-users',
  name: 'Access Control',
  description: 'RBAC coverage.',
  projectId: project.id,
  createdDate: date,
  updatedDate: date,
};

const testCase = {
  id: 'test-case-users',
  name: 'Verify role access',
  description: 'Checks role permissions.',
  precondition: 'Users exist.',
  steps: [
    {
      id: 'step-users',
      description: 'Open a protected area',
      expectedResult: 'Access follows the role',
    },
  ],
  projectId: project.id,
  scenarioId: scenario.id,
  createdDate: date,
  updatedDate: date,
};

function makeDefect(id: string, assignee = developer, reporter = tester) {
  return {
    id,
    defectId: `DEF-${id.slice(-4).padStart(4, '0')}`,
    title: `Permission defect ${id}`,
    description: 'Access did not match the expected role.',
    stepsToReproduce: 'Open the protected action.',
    expectedResult: 'The correct permission is applied.',
    actualResult: 'The action was incorrect.',
    status: 'Open',
    severity: 'Medium',
    priority: 'Medium',
    assigneeName: assignee.displayName,
    reporterName: reporter.displayName,
    assignee: { userId: assignee.id, displayName: assignee.displayName },
    reporter: { userId: reporter.id, displayName: reporter.displayName },
    projectId: project.id,
    scenarioId: scenario.id,
    testCaseId: testCase.id,
    createdDate: date,
    updatedDate: date,
  };
}

async function seed(
  page: Page,
  options: {
    users?: unknown[];
    activeUserId?: string;
    projects?: unknown[];
    scenarios?: unknown[];
    testCases?: unknown[];
    executions?: unknown[];
    defects?: unknown[];
  } = {},
) {
  await page.goto('/');
  await page.evaluate((records) => {
    localStorage.setItem('testnest.users', JSON.stringify(records.users ?? []));
    if (records.activeUserId) {
      localStorage.setItem('testnest.activeUserId', records.activeUserId);
    } else {
      localStorage.removeItem('testnest.activeUserId');
    }
    localStorage.setItem('testnest.projects', JSON.stringify(records.projects ?? []));
    localStorage.setItem('testnest.scenarios', JSON.stringify(records.scenarios ?? []));
    localStorage.setItem('testnest.testCases', JSON.stringify(records.testCases ?? []));
    localStorage.setItem('testnest.executions', JSON.stringify(records.executions ?? []));
    localStorage.setItem('testnest.defects', JSON.stringify(records.defects ?? []));
  }, options);
  await page.reload();
}

async function authenticateAs(page: Page, user: ReturnType<typeof makeUser>, profiles: ReturnType<typeof makeUser>[]) {
  await page.evaluate(({ activeProfile, availableProfiles }) => {
    localStorage.setItem('testnest.testAuth', JSON.stringify({
      session: { user: { id: activeProfile.id, email: activeProfile.email } },
      accounts: availableProfiles.map(({ id, email }) => ({ id, email })),
      profiles: availableProfiles,
    }));
  }, { activeProfile: user, availableProfiles: profiles });
  await page.reload();
}

async function openUsers(page: Page) {
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Users' })).toBeVisible();
}

async function addUser(
  page: Page,
  values: {
    firstName: string;
    lastName: string;
    email: string;
    role?: Role;
    status?: Status;
  },
) {
  await page.getByRole('button', { name: 'Add User' }).click();
  await page.getByLabel('First Name').fill(values.firstName);
  await page.getByLabel('Last Name').fill(values.lastName);
  await page.getByLabel('Email').fill(values.email);
  if (values.role) await page.getByLabel('Role').selectOption(values.role);
  if (values.status) await page.getByLabel('Status').selectOption(values.status);
  await page.getByRole('button', { name: 'Save User' }).click();
}

async function selectExecutionContext(page: Page) {
  await page.getByRole('button', { name: 'Test Execution' }).click();
  await page.getByLabel('Project').selectOption(project.id);
  await page.getByLabel('Test Scenario').selectOption(scenario.id);
  await page.getByLabel('Test Case').selectOption(testCase.id);
}

test.describe('User management, roles, and permissions', () => {
  test('creates the default Admin and opens User Management', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Main navigation').getByText('TestNest Admin')).toBeVisible();
    await expect(page.getByLabel('Current User')).toHaveCount(0);
    await openUsers(page);
    await expect(page.getByRole('rowheader', { name: 'TestNest Admin' })).toBeVisible();
    await expect(page.getByLabel('Total Users: 1')).toBeVisible();
  });

  test('validates required fields and invalid email format', async ({ page }) => {
    await seed(page, { users: [admin], activeUserId: admin.id });
    await openUsers(page);
    await page.getByRole('button', { name: 'Add User' }).click();
    await page.getByRole('button', { name: 'Save User' }).click();
    await expect(page.getByText('First Name is required.')).toBeVisible();
    await expect(page.getByText('Last Name is required.')).toBeVisible();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await page.getByLabel('First Name').fill('Invalid');
    await page.getByLabel('Last Name').fill('Email');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Save User' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('prevents exact and case-insensitive duplicate emails', async ({ page }) => {
    await seed(page, { users: [admin, tester], activeUserId: admin.id });
    await openUsers(page);
    await addUser(page, { firstName: 'Duplicate', lastName: 'User', email: tester.email });
    await expect(page.getByText('A user with this email already exists.')).toBeVisible();
    await page.getByLabel('Email').fill(`  ${tester.email.toLocaleUpperCase()}  `);
    await page.getByRole('button', { name: 'Save User' }).click();
    await expect(page.getByText('A user with this email already exists.')).toBeVisible();
  });

  test('creates, trims, and persists a User after refresh', async ({ page }) => {
    await seed(page, { users: [admin], activeUserId: admin.id });
    await openUsers(page);
    await addUser(page, { firstName: '  Morgan ', lastName: ' Tester  ', email: ' MORGAN@EXAMPLE.COM ' });
    await expect(page.getByRole('rowheader', { name: 'Morgan Tester' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'morgan@example.com' })).toBeVisible();
    await page.reload();
    await openUsers(page);
    await expect(page.getByRole('rowheader', { name: 'Morgan Tester' })).toBeVisible();
  });

  test('edits a User and changes their Role', async ({ page }) => {
    await seed(page, { users: [admin, tester], activeUserId: admin.id });
    await openUsers(page);
    await page.getByRole('button', { name: `Edit ${tester.displayName}` }).click();
    await page.getByLabel('First Name').fill('Updated');
    await page.getByLabel('Role').selectOption('Developer');
    await page.getByRole('button', { name: 'Save User' }).click();
    const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Updated Tester' }) });
    await expect(row.getByText('Developer', { exact: true })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('testnest.users') ?? '[]').find((user: { id: string }) => user.id === 'tester-user'));
    expect(stored.updatedDate).not.toBe(date);
  });

  test('deactivates and reactivates a User', async ({ page }) => {
    await seed(page, { users: [admin, tester], activeUserId: admin.id });
    await openUsers(page);
    await page.getByRole('button', { name: `Deactivate ${tester.displayName}` }).click();
    await expect(page.getByRole('button', { name: `Activate ${tester.displayName}` })).toBeVisible();
    await expect(page.getByLabel('Current User').getByRole('option', { name: /Taylor Tester/ })).toHaveCount(0);
    await page.getByRole('button', { name: `Activate ${tester.displayName}` }).click();
    await expect(page.getByRole('button', { name: `Deactivate ${tester.displayName}` })).toBeVisible();
  });

  test('searches, filters, sorts, and clears the User table', async ({ page }) => {
    await seed(page, { users: [admin, lead, tester, inactive], activeUserId: admin.id });
    await openUsers(page);
    await page.getByLabel('Search users').fill('taylor');
    await expect(page.getByRole('rowheader', { name: tester.displayName })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await page.getByLabel('Filter by Role').selectOption('QA Lead');
    await expect(page.getByRole('rowheader', { name: lead.displayName })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await page.getByLabel('Filter by Status').selectOption('Inactive');
    await expect(page.getByRole('rowheader', { name: inactive.displayName })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await page.getByRole('button', { name: /Sort by Name/ }).click();
    await expect(page.getByRole('table', { name: 'Users' }).getByRole('row').nth(1)).toContainText('Avery Admin');
  });

  test('paginates Users and resets filtering to the first page', async ({ page }) => {
    const manyUsers = [admin, ...Array.from({ length: 12 }, (_, index) => makeUser(`tester-${index}`, `Tester ${String(index).padStart(2, '0')}`, 'Tester'))];
    await seed(page, { users: manyUsers, activeUserId: admin.id });
    await openUsers(page);
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await page.getByLabel('Search users').fill('Tester 00');
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toHaveCount(0);
  });

  test('protects the last Active Admin from deactivation and demotion', async ({ page }) => {
    await seed(page, { users: [admin], activeUserId: admin.id });
    await openUsers(page);
    await page.getByRole('button', { name: `Deactivate ${admin.displayName}` }).click();
    await expect(page.getByRole('alert')).toHaveText('TestNest must keep at least one Active Admin.');
    await page.getByRole('button', { name: `Edit ${admin.displayName}` }).click();
    await page.getByLabel('Role').selectOption('Viewer');
    await page.getByRole('button', { name: 'Save User' }).click();
    await expect(page.getByRole('region', { name: 'Edit User' }).getByRole('alert')).toHaveText('TestNest must keep at least one Active Admin.');
  });

  test('uses authenticated identity and removes the legacy Active User switcher', async ({ page }) => {
    await seed(page, { users: [admin, tester, inactive], activeUserId: admin.id });
    await expect(page.getByLabel('Main navigation').getByText(admin.displayName)).toBeVisible();
    await expect(page.getByLabel('Current User')).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel('Main navigation').getByText(admin.displayName)).toBeVisible();
    await expect(page.getByLabel('Current User')).toHaveCount(0);
  });

  for (const user of [lead, tester]) {
    test(`${user.role} cannot access User Management`, async ({ page }) => {
      await seed(page, { users: [admin, user], activeUserId: user.id });
      await expect(page.getByRole('button', { name: 'Users', exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Main navigation').getByText(user.displayName)).toBeVisible();
    });
  }

  test('Admin sees management actions across TestNest', async ({ page }) => {
    await seed(page, { users: [admin], activeUserId: admin.id, projects: [project], scenarios: [scenario], testCases: [testCase] });
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
    await page.getByRole('button', { name: 'Test Cases' }).click();
    await expect(page.getByRole('button', { name: 'Import Test Cases' })).toBeVisible();
    await selectExecutionContext(page);
    await expect(page.getByRole('button', { name: 'Start Quick Run' })).toBeVisible();
    await page.getByRole('button', { name: 'Defects', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Defect' })).toBeVisible();
  });

  test('Tester can execute tests and records Executed By', async ({ page }) => {
    await seed(page, { users: [admin, tester], activeUserId: tester.id, projects: [project], scenarios: [scenario], testCases: [testCase] });
    await selectExecutionContext(page);
    await page.getByRole('button', { name: 'Start Quick Run' }).click();
    await page.getByLabel('Overall Status', { exact: true }).selectOption('Passed');
    await page.getByRole('button', { name: 'Save Quick Run' }).click();
    await expect(page.getByRole('cell', { name: tester.displayName })).toBeVisible();
    const execution = await page.evaluate(() => JSON.parse(localStorage.getItem('testnest.executions') ?? '[]')[0]);
    expect(execution.executedBy).toEqual({ userId: tester.id, displayName: tester.displayName });
  });

  test('Developer views Defects, edits an assigned Defect, and cannot execute', async ({ page }) => {
    const assigned = makeDefect('1');
    const other = makeDefect('2', tester, admin);
    await seed(page, { users: [admin, tester, developer], activeUserId: developer.id, projects: [project], scenarios: [scenario], testCases: [testCase], defects: [assigned, other] });
    await selectExecutionContext(page);
    await expect(page.getByRole('button', { name: 'Start Quick Run' })).toHaveCount(0);
    await expect(page.getByText('read-only access to Test Execution history')).toBeVisible();
    await page.getByRole('button', { name: 'Defects', exact: true }).click();
    await expect(page.getByRole('button', { name: `Edit ${assigned.defectId}` })).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${other.defectId}` })).toHaveCount(0);
    await page.getByRole('button', { name: `Edit ${assigned.defectId}` }).click();
    await page.getByLabel('Status').selectOption('In Progress');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(page.getByRole('cell', { name: 'In Progress' })).toBeVisible();
  });

  test('Viewer has read-only behavior throughout the application', async ({ page }) => {
    await seed(page, { users: [admin, viewer], activeUserId: viewer.id, projects: [project], scenarios: [scenario], testCases: [testCase], defects: [makeDefect('3')] });
    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('button', { name: 'Create Project' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Edit ${project.name}` })).toHaveCount(0);
    await page.getByRole('button', { name: 'Test Cases' }).click();
    await expect(page.getByRole('button', { name: 'Import Test Cases' })).toHaveCount(0);
    await page.getByLabel('Project').selectOption(project.id);
    await expect(page.getByRole('button', { name: 'Create Scenario' })).toHaveCount(0);
    await selectExecutionContext(page);
    await expect(page.getByRole('button', { name: 'Start Quick Run' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Defects', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Defect' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Edit DEF-/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page.getByRole('button', { name: 'Export Report' })).toHaveCount(0);
  });

  test('does not let the legacy activeUserId replace authenticated identity', async ({ page }) => {
    await seed(page, { users: [admin, tester], activeUserId: admin.id });
    await openUsers(page);
    await page.evaluate((testerId) => {
      localStorage.setItem('testnest.activeUserId', testerId);
    }, tester.id);
    await expect(page.getByLabel('Main navigation').getByText(admin.displayName)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeVisible();
    await expect(page.getByLabel('Current User')).toHaveCount(0);
  });

  test('records Created By and Updated By on Projects', async ({ page }) => {
    await seed(page, { users: [admin, lead], activeUserId: admin.id });
    await page.getByRole('button', { name: 'Projects' }).click();
    await page.getByRole('button', { name: 'Create Project' }).click();
    await page.getByLabel('Project Name').fill('Audited Project');
    await page.getByRole('button', { name: 'Save Project' }).click();
    await authenticateAs(page, lead, [admin, lead]);
    await page.getByRole('button', { name: 'Projects' }).click();
    await page.getByRole('button', { name: 'Edit Audited Project' }).click();
    await page.getByLabel('Description').fill('Updated by QA Lead.');
    await page.getByRole('button', { name: 'Save Project' }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('testnest.projects') ?? '[]')[0]);
    expect(stored.createdBy).toEqual({ userId: admin.id, displayName: admin.displayName });
    expect(stored.updatedBy).toEqual({ userId: lead.id, displayName: lead.displayName });
  });

  test('records Created By on a Tester-authored Test Case', async ({ page }) => {
    await seed(page, { users: [admin, tester], activeUserId: tester.id, projects: [project], scenarios: [scenario] });
    await page.getByRole('button', { name: 'Test Cases' }).click();
    await page.getByLabel('Project').selectOption(project.id);
    await page.getByLabel('Test Scenario', { exact: true }).selectOption(scenario.id);
    await page.getByRole('button', { name: 'Create Test Case' }).click();
    await page.getByLabel('Test Case Name').fill('Tester audit case');
    await page.getByLabel('Step 1 Description').fill('Perform the action');
    await page.getByLabel('Step 1 Expected Result').fill('The action succeeds');
    await page.getByRole('button', { name: 'Save Test Case' }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('testnest.testCases') ?? '[]')[0]);
    expect(stored.createdBy).toEqual({ userId: tester.id, displayName: tester.displayName });
    expect(stored.updatedBy).toEqual(stored.createdBy);
  });

  test('defaults Defect Reporter, uses Active assignees, and preserves history after deactivation', async ({ page }) => {
    await seed(page, { users: [admin, tester, inactive], activeUserId: admin.id, projects: [project] });
    await page.getByRole('button', { name: 'Defects', exact: true }).click();
    await page.getByRole('button', { name: 'Add Defect' }).click();
    await page.getByLabel('Title').fill('User-backed ownership');
    await expect(page.getByLabel('Reporter')).toHaveValue(admin.displayName);
    await page.getByLabel('Assignee').selectOption(tester.id);
    await expect(page.getByLabel('Assignee').getByRole('option', { name: /Ina Inactive/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await page.getByRole('button', { name: 'Users', exact: true }).click();
    await page.getByRole('button', { name: `Deactivate ${tester.displayName}` }).click();
    await page.getByRole('button', { name: 'Defects', exact: true }).click();
    await expect(page.getByRole('cell', { name: tester.displayName })).toBeVisible();
    await page.getByRole('button', { name: 'View DEF-0001' }).click();
    await expect(page.getByText(tester.displayName, { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'User-backed ownership' }).getByText(admin.displayName, { exact: true }).first()).toBeVisible();
  });

  test('filters Reports by Executed By, Defect Assignee, and Defect Reporter', async ({ page }) => {
    const execution = {
      id: 'execution-user-filter',
      executionMode: 'quick',
      projectId: project.id,
      scenarioId: scenario.id,
      testCaseId: testCase.id,
      overallStatus: 'Passed',
      executionDate: '2026-08-02T00:00:00.000Z',
      notes: '',
      stepResults: [],
      executedBy: { userId: tester.id, displayName: tester.displayName },
    };
    await seed(page, { users: [admin, tester, developer], activeUserId: admin.id, projects: [project], scenarios: [scenario], testCases: [testCase], executions: [execution], defects: [makeDefect('4')] });
    await page.getByRole('button', { name: 'Reports' }).click();
    const filters = page.getByRole('region', { name: 'Report Filters' });
    await filters.getByLabel('Executed By').selectOption(tester.id);
    await filters.getByLabel('Defect Assignee').selectOption(developer.id);
    await filters.getByLabel('Defect Reporter').selectOption(tester.id);
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    await expect(page.getByText('Matching data: 1 Test Cases, 1 executions, and 1 defects.')).toBeVisible();
    await expect(page.getByLabel('Active report filters: 3')).toBeVisible();
  });

  test('keeps legacy execution and Defect user references readable', async ({ page }) => {
    const legacyExecution = {
      id: 'legacy-execution', executionMode: 'quick', projectId: project.id, scenarioId: scenario.id, testCaseId: testCase.id,
      overallStatus: 'Passed', executionDate: date, notes: '', stepResults: [],
    };
    const legacyDefect = { ...makeDefect('5'), assignee: undefined, reporter: undefined, createdBy: undefined, updatedBy: undefined };
    await seed(page, { users: [admin], activeUserId: admin.id, projects: [project], scenarios: [scenario], testCases: [testCase], executions: [legacyExecution], defects: [legacyDefect] });
    await selectExecutionContext(page);
    await expect(page.getByRole('cell', { name: 'Legacy Record' })).toBeVisible();
    await page.getByRole('button', { name: 'Defects', exact: true }).click();
    await page.getByRole('button', { name: `View ${legacyDefect.defectId}` }).click();
    await expect(page.getByText('Legacy Record', { exact: true })).toHaveCount(2);
  });
});
