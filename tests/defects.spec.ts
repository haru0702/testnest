import { expect, test, type Page } from '@playwright/test';

const project = {
  id: 'project-qa',
  name: 'QA Platform',
  description: 'Platform coverage.',
  status: 'Active',
  createdDate: '2026-01-01T00:00:00.000Z',
  updatedDate: '2026-01-01T00:00:00.000Z',
};

const secondProject = {
  ...project,
  id: 'project-shop',
  name: 'Storefront',
};

const scenario = {
  id: 'scenario-login',
  name: 'Login',
  description: 'Authentication coverage.',
  projectId: project.id,
  createdDate: '2026-01-01T00:00:00.000Z',
  updatedDate: '2026-01-01T00:00:00.000Z',
};

const testCase = {
  id: 'test-case-login',
  name: 'Verify Login',
  description: 'Verify a user can sign in.',
  precondition: 'A registered user exists.',
  projectId: project.id,
  scenarioId: scenario.id,
  steps: [
    {
      id: 'step-click-login',
      description: 'Click Login',
      expectedResult: 'Dashboard appears',
    },
  ],
  createdDate: '2026-01-01T00:00:00.000Z',
  updatedDate: '2026-01-01T00:00:00.000Z',
};

function makeExecution(
  status: 'Failed' | 'Blocked',
  id = `execution-${status.toLocaleLowerCase()}`,
) {
  return {
    id,
    executionMode: 'detailed',
    projectId: project.id,
    scenarioId: scenario.id,
    testCaseId: testCase.id,
    overallStatus: status,
    executionDate: '2026-01-03T12:00:00.000Z',
    notes: `${status} regression run.`,
    stepResults: [
      {
        testStepId: 'step-click-login',
        stepNumber: 1,
        stepDescription: 'Click Login',
        expectedResult: 'Dashboard appears',
        actualResult: 'An error message appears',
        status,
      },
    ],
  };
}

function makeDefect(
  number: number,
  overrides: Record<string, unknown> = {},
) {
  const date = new Date(Date.UTC(2026, 0, number)).toISOString();
  return {
    id: `defect-internal-${number}`,
    defectId: `DEF-${String(number).padStart(4, '0')}`,
    title: `Defect ${String(number).padStart(2, '0')}`,
    description: `Description for defect ${number}.`,
    stepsToReproduce: 'Open the page.',
    expectedResult: 'The page loads.',
    actualResult: 'An error appears.',
    status: 'Open',
    severity: 'Medium',
    priority: 'Medium',
    assigneeName: '',
    reporterName: 'QA Reporter',
    createdDate: date,
    updatedDate: date,
    ...overrides,
  };
}

async function seedData(
  page: Page,
  options: {
    projects?: unknown[];
    scenarios?: unknown[];
    testCases?: unknown[];
    executions?: unknown[];
    defects?: unknown[];
  } = {},
) {
  await page.goto('/');
  await page.evaluate((records) => {
    localStorage.setItem(
      'testnest.projects',
      JSON.stringify(records.projects ?? []),
    );
    localStorage.setItem(
      'testnest.scenarios',
      JSON.stringify(records.scenarios ?? []),
    );
    localStorage.setItem(
      'testnest.testCases',
      JSON.stringify(records.testCases ?? []),
    );
    localStorage.setItem(
      'testnest.executions',
      JSON.stringify(records.executions ?? []),
    );
    localStorage.setItem(
      'testnest.defects',
      JSON.stringify(records.defects ?? []),
    );
  }, options);
  await page.reload();
}

async function openDefects(page: Page) {
  await page.getByRole('button', { name: 'Defects', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Defects' }),
  ).toBeVisible();
}

async function addManualDefect(
  page: Page,
  options: {
    title?: string;
    status?: string;
    severity?: string;
    priority?: string;
    project?: string;
    assignee?: string;
  } = {},
) {
  await page.getByRole('button', { name: 'Add Defect' }).click();
  await page.getByLabel('Title').fill(options.title ?? 'Login is unavailable');
  await page.getByLabel('Status').selectOption(options.status ?? 'Open');
  await page.getByLabel('Severity').selectOption(options.severity ?? 'Medium');
  await page.getByLabel('Priority').selectOption(options.priority ?? 'Medium');
  if (options.project) {
    await page.getByLabel('Linked Project').selectOption({ label: options.project });
  }
  if (options.assignee) {
    await page.getByLabel('Assignee Name').fill(options.assignee);
  }
  await page.getByRole('button', { name: 'Save Defect' }).click();
}

async function selectExecutionContext(page: Page) {
  await page.getByRole('button', { name: 'Test Execution' }).click();
  await page.getByLabel('Project').selectOption({ label: project.name });
  await page.getByLabel('Test Scenario').selectOption({ label: scenario.name });
  await page.getByLabel('Test Case').selectOption({ label: testCase.name });
}

test.describe('Defect management', () => {
  test('opens Defects and shows its empty state', async ({ page }) => {
    await page.goto('/');
    await openDefects(page);

    await expect(page.getByText('No defects yet')).toBeVisible();
    await expect(page.getByLabel('Total Defects: 0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Defect' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Defect' }).click();
    await page.getByLabel('Title').fill('Unsaved defect');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('No defects yet')).toBeVisible();
    await expect(page.getByText('Unsaved defect')).toHaveCount(0);
  });

  test('validates, trims, creates, summarizes, and persists a manual defect', async ({ page }) => {
    await page.goto('/');
    await openDefects(page);
    await page.getByRole('button', { name: 'Add Defect' }).click();
    await page.getByLabel('Title').fill('   ');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(page.getByText('Defect Title is required.')).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Title').fill('  Login is unavailable  ');
    await page.getByLabel('Severity').selectOption('Critical');
    await page.getByRole('button', { name: 'Save Defect' }).click();

    await expect(page.getByRole('rowheader', { name: 'Login is unavailable' })).toBeVisible();
    await expect(page.getByText('DEF-0001', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Total Defects: 1')).toBeVisible();
    await expect(page.getByLabel('Open: 1')).toBeVisible();
    await expect(page.getByLabel('Critical: 1')).toBeVisible();

    await page.reload();
    await openDefects(page);
    await expect(page.getByRole('rowheader', { name: 'Login is unavailable' })).toBeVisible();
  });

  test('edits status and cancels an edit without saving', async ({ page }) => {
    await seedData(page, { defects: [makeDefect(1)] });
    await openDefects(page);

    await page.getByRole('button', { name: 'Edit DEF-0001' }).click();
    await page.getByLabel('Title').fill('Unsaved title');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();
    await expect(page.getByText('Unsaved title')).toHaveCount(0);

    await page.getByRole('button', { name: 'Edit DEF-0001' }).click();
    await page.getByLabel('Title').fill('Updated defect title');
    await page.getByLabel('Status').selectOption('Ready for Retest');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    const row = page.getByRole('row').filter({ hasText: 'Updated defect title' });
    await expect(row.getByText('Ready for Retest', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Ready for Retest: 1')).toBeVisible();
  });

  test('searches defects by ID, title, description, and external key', async ({ page }) => {
    const records = [
      makeDefect(1, { title: 'Checkout failure', externalIssueKey: 'SHOP-17' }),
      makeDefect(2, { title: 'Profile issue', description: 'Avatar upload is broken' }),
    ];
    await seedData(page, { defects: records });
    await openDefects(page);

    for (const query of ['DEF-0001', 'Checkout', 'Avatar upload', 'SHOP-17']) {
      await page.getByLabel('Search defects').fill(query);
      await expect(page.getByText('1 result')).toBeVisible();
    }
  });

  test('filters by project, status, severity, and priority', async ({ page }) => {
    const records = [
      makeDefect(1, {
        projectId: project.id,
        status: 'In Progress',
        severity: 'Critical',
        priority: 'High',
      }),
      makeDefect(2, {
        projectId: secondProject.id,
        status: 'Closed',
        severity: 'Low',
        priority: 'Low',
      }),
    ];
    await seedData(page, { projects: [project, secondProject], defects: records });
    await openDefects(page);

    await page.getByLabel('Filter by Project').selectOption({ label: project.name });
    await page.getByLabel('Filter by Status').selectOption('In Progress');
    await page.getByLabel('Filter by Severity').selectOption('Critical');
    await page.getByLabel('Filter by Priority').selectOption('High');
    await expect(page.getByText('1 result')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();
  });

  test('filters assignee, execution linkage, external links, and external system', async ({ page }) => {
    const records = [
      makeDefect(1, {
        assigneeName: 'Alex Rivera',
        executionId: 'execution-1',
        externalSystem: 'Jira',
        externalIssueKey: 'QA-17',
        externalIssueUrl: 'https://example.com/issues/QA-17',
      }),
      makeDefect(2),
    ];
    await seedData(page, { defects: records });
    await openDefects(page);

    await page.getByLabel('Filter by Assignee').selectOption('Alex Rivera');
    await page.getByLabel('Linked to Test Execution').selectOption('yes');
    await page.getByLabel('External Issue Linked').selectOption('yes');
    await page.getByLabel('Filter by External System').selectOption('Jira');
    await expect(page.getByText('1 result')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();
  });

  test('combines every defect filter and clears the complete table state', async ({ page }) => {
    const matchingDefect = makeDefect(1, {
      title: 'Checkout integration failure',
      projectId: project.id,
      status: 'In Progress',
      severity: 'Critical',
      priority: 'High',
      assigneeName: 'Alex Rivera',
      executionId: 'execution-1',
      externalSystem: 'Jira',
      externalIssueKey: 'SHOP-17',
      externalIssueUrl: 'https://example.com/SHOP-17',
    });
    await seedData(page, {
      projects: [project, secondProject],
      defects: [matchingDefect, makeDefect(2, { projectId: secondProject.id })],
    });
    await openDefects(page);

    await page.getByLabel('Search defects').fill('SHOP-17');
    await page.getByLabel('Filter by Project').selectOption(project.id);
    await page.getByLabel('Filter by Status').selectOption('In Progress');
    await page.getByLabel('Filter by Severity').selectOption('Critical');
    await page.getByLabel('Filter by Priority').selectOption('High');
    await page.getByLabel('Filter by Assignee').selectOption('Alex Rivera');
    await page.getByLabel('Filter by External System').selectOption('Jira');
    await page.getByLabel('Linked to Test Execution').selectOption('yes');
    await page.getByLabel('External Issue Linked').selectOption('yes');

    await expect(page.getByText('1 result')).toBeVisible();
    const table = page.getByRole('table', { name: 'Defects' });
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(page.getByRole('rowheader', { name: 'Checkout integration failure' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page.getByLabel('Search defects')).toHaveValue('');
    await expect(page.getByLabel('Filter by Project')).toHaveValue('all');
    await expect(page.getByLabel('Filter by Status')).toHaveValue('all');
    await expect(page.getByLabel('Filter by Severity')).toHaveValue('all');
    await expect(page.getByLabel('Filter by Priority')).toHaveValue('all');
    await expect(page.getByLabel('Filter by Assignee')).toHaveValue('all');
    await expect(page.getByLabel('Filter by External System')).toHaveValue('all');
    await expect(page.getByLabel('Linked to Test Execution')).toHaveValue('all');
    await expect(page.getByLabel('External Issue Linked')).toHaveValue('all');
    await expect(page.getByText('2 results')).toBeVisible();
  });

  test('sorts defects, clears filters, and paginates results', async ({ page }) => {
    const records = Array.from({ length: 12 }, (_, index) => makeDefect(index + 1));
    await seedData(page, { defects: records });
    await openDefects(page);

    await expect(page.getByRole('rowheader', { name: 'Defect 12' })).toBeVisible();
    await page.getByRole('button', { name: 'Sort by Defect ID' }).click();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('rowheader', { name: 'Defect 11' })).toBeVisible();

    await page.getByLabel('Filter by Status').selectOption('Open');
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();

    await page.getByLabel('Search defects').fill('Defect 03');
    await expect(page.getByText('1 result')).toBeVisible();
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page.getByText('12 results')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Defect 12' })).toBeVisible();
  });

  test('cancels deletion, then deletes only the selected defect', async ({ page }) => {
    await seedData(page, { defects: [makeDefect(1), makeDefect(2)] });
    await openDefects(page);

    await page.getByRole('button', { name: 'Delete DEF-0001' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete DEF-0001' }).click();
    await page.getByRole('button', { name: 'Delete Defect' }).click();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toHaveCount(0);
    await expect(page.getByRole('rowheader', { name: 'Defect 02' })).toBeVisible();
    await expect(page.getByLabel('Total Defects: 1')).toBeVisible();
  });

  for (const status of ['Failed', 'Blocked'] as const) {
    test(`creates a reviewed defect from a ${status} execution`, async ({ page }) => {
      const execution = makeExecution(status);
      await seedData(page, {
        projects: [project],
        scenarios: [scenario],
        testCases: [testCase],
        executions: [execution],
      });
      await selectExecutionContext(page);
      await page.getByRole('button', { name: new RegExp(`Create defect from ${status} execution 1`, 'i') }).click();

      await expect(page.getByRole('heading', { level: 2, name: 'Defects' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: 'Add Defect' })).toBeVisible();
      await expect(page.getByLabel('Title')).toHaveValue(
        `Verify Login - Click Login ${status.toLocaleLowerCase()}`,
      );
      await expect(page.getByLabel('Linked Project')).toHaveValue(project.id);
      await expect(page.getByLabel('Linked Scenario')).toHaveValue(scenario.id);
      await expect(page.getByLabel('Linked Test Case')).toHaveValue(testCase.id);
      await expect(page.getByLabel('Linked Execution')).toHaveValue(execution.id);
      await expect(page.getByLabel('Linked Test Step')).toHaveValue('step-click-login');
      await expect(page.getByLabel('Expected Result')).toHaveValue('Dashboard appears');
      await expect(page.getByLabel('Actual Result')).toHaveValue('An error message appears');

      expect(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
        ),
      ).toEqual([]);

      await page.getByRole('button', { name: 'Save Defect' }).click();
      await expect(
        page.getByRole('rowheader', {
          name: `Verify Login - Click Login ${status.toLocaleLowerCase()}`,
        }),
      ).toBeVisible();

      const storedData = await page.evaluate(() => ({
        defects: JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
        executions: JSON.parse(localStorage.getItem('testnest.executions') ?? '[]'),
      }));
      expect(storedData.defects[0]).toMatchObject({
        projectId: project.id,
        scenarioId: scenario.id,
        testCaseId: testCase.id,
        executionId: execution.id,
        testStepId: 'step-click-login',
      });
      expect(storedData.executions).toEqual([execution]);
    });
  }

  test('creates a defect from a failed step with expected and actual results', async ({ page }) => {
    const execution = makeExecution('Failed');
    await seedData(page, {
      projects: [project],
      scenarios: [scenario],
      testCases: [testCase],
      executions: [execution],
    });
    await selectExecutionContext(page);
    await page.getByRole('button', { name: 'View execution details 1' }).click();
    await page.getByRole('button', { name: 'Create Defect from Step 1' }).click();

    await expect(page.getByLabel('Title')).toHaveValue('Verify Login - Click Login failed');
    await expect(page.getByLabel('Expected Result')).toHaveValue('Dashboard appears');
    await expect(page.getByLabel('Actual Result')).toHaveValue('An error message appears');
    await expect(page.getByLabel('Linked Test Step')).toHaveValue('step-click-login');
    await page.getByRole('button', { name: 'Save Defect' }).click();

    await page.getByRole('button', { name: 'View DEF-0001' }).click();
    await expect(page.getByText('Step 1: Click Login', { exact: true })).toBeVisible();
  });

  test('shows readable traceability and navigates back to linked execution details', async ({ page }) => {
    const execution = makeExecution('Failed');
    const defect = makeDefect(1, {
      projectId: project.id,
      scenarioId: scenario.id,
      testCaseId: testCase.id,
      executionId: execution.id,
      testStepId: 'step-click-login',
      testStepNumber: 1,
    });
    await seedData(page, {
      projects: [project],
      scenarios: [scenario],
      testCases: [testCase],
      executions: [execution],
      defects: [defect],
    });
    await openDefects(page);
    await page.getByRole('button', { name: 'View DEF-0001' }).click();

    await expect(page.getByText(project.name, { exact: true })).toBeVisible();
    await expect(page.getByText(scenario.name, { exact: true })).toBeVisible();
    await expect(page.getByText(testCase.name, { exact: true })).toBeVisible();
    await expect(page.getByText('Step 1: Click Login', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'View Linked Test Execution' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Test Execution' })).toBeVisible();
    await expect(page.getByLabel('Project')).toHaveValue(project.id);
    await expect(page.getByLabel('Test Scenario')).toHaveValue(scenario.id);
    await expect(page.getByLabel('Test Case')).toHaveValue(testCase.id);
    await expect(page.getByRole('heading', { name: 'Execution Details' })).toBeVisible();
  });

  test('validates, saves, and opens an external issue link in a new tab', async ({ page, context }) => {
    await page.goto('/');
    await openDefects(page);
    await page.getByRole('button', { name: 'Add Defect' }).click();
    await page.getByLabel('Title').fill('Linked Jira issue');
    await page.getByLabel('External System').selectOption('Jira');
    await page.getByLabel('External Issue Key').fill('QA-123');
    await page.getByLabel('External Issue URL').fill('example.atlassian.net/browse/QA-123');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(page.getByText('External Issue URL must start with http:// or https://.')).toBeVisible();
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
      ),
    ).toEqual([]);

    await page.getByLabel('External Issue URL').fill('https://example.atlassian.net/browse/QA-123');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await page.getByRole('button', { name: 'View DEF-0001' }).click();

    await expect(page.getByText('Jira', { exact: true })).toBeVisible();
    await expect(page.getByText('QA-123', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Open External Issue' }),
    ).toHaveAttribute(
      'href',
      'https://example.atlassian.net/browse/QA-123',
    );
    await context.route('https://example.atlassian.net/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: 'External issue' });
    });
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Open External Issue' }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL('https://example.atlassian.net/browse/QA-123');
    await popup.close();
  });

  test('creates the complete standalone acceptance defect and preserves it after refresh', async ({ page }) => {
    await page.goto('/');
    await openDefects(page);
    await page.getByRole('button', { name: 'Add Defect' }).click();

    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(page.getByText('Defect Title is required.')).toBeVisible();
    await page.getByLabel('Title').fill('   ');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(page.getByText('Defect Title is required.')).toBeVisible();
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
      ),
    ).toEqual([]);

    await page.getByLabel('Title').fill('  Login page error on submit  ');
    await page
      .getByLabel('Description')
      .fill('An error appears when submitting the login form.');
    await page
      .getByLabel('Steps to Reproduce')
      .fill('1. Open Login page\n2. Enter credentials\n3. Click Login');
    await page
      .getByLabel('Expected Result')
      .fill('User is redirected to Dashboard.');
    await page
      .getByLabel('Actual Result')
      .fill('An error message is displayed.');
    await page.getByLabel('Severity').selectOption('High');
    await page.getByLabel('Priority').selectOption('High');
    await page.getByLabel('Status').selectOption('Open');
    await page.getByLabel('Reporter Name').fill('QA Tester');
    await page.getByRole('button', { name: 'Save Defect' }).click();

    const row = page.getByRole('row').filter({
      has: page.getByRole('rowheader', { name: 'Login page error on submit' }),
    });
    await expect(row.getByText(/^DEF-\d{4}$/)).toHaveText('DEF-0001');
    await expect(row.getByText('Open', { exact: true })).toBeVisible();
    await expect(row.getByText('High', { exact: true })).toHaveCount(2);
    await expect(page.getByLabel('Total Defects: 1')).toBeVisible();
    await expect(page.getByLabel('Open: 1')).toBeVisible();

    await page.getByRole('button', { name: 'View DEF-0001' }).click();
    await expect(page.getByText('An error appears when submitting the login form.')).toBeVisible();
    await expect(page.getByText('1. Open Login page\n2. Enter credentials\n3. Click Login')).toBeVisible();
    await expect(page.getByText('User is redirected to Dashboard.')).toBeVisible();
    await expect(page.getByText('An error message is displayed.')).toBeVisible();
    await expect(page.getByText('QA Tester', { exact: true })).toBeVisible();

    await page.reload();
    await openDefects(page);
    await expect(page.getByRole('rowheader', { name: 'Login page error on submit' })).toBeVisible();
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('testnest.defects') ?? '[]')[0],
      ),
    ).toMatchObject({
      defectId: 'DEF-0001',
      title: 'Login page error on submit',
      severity: 'High',
      priority: 'High',
      status: 'Open',
      reporterName: 'QA Tester',
    });
  });

  test('preserves dates, saves the full status workflow, and cancels later edits', async ({ page }) => {
    const original = makeDefect(1, {
      title: 'Workflow defect',
      createdDate: '2025-01-01T00:00:00.000Z',
      updatedDate: '2025-01-01T00:00:00.000Z',
    });
    await seedData(page, { defects: [original] });
    await openDefects(page);
    const row = page.getByRole('row').filter({ hasText: 'Workflow defect' });
    await expect(row.getByText('Open', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit DEF-0001' }).click();
    await page.getByLabel('Status').selectOption('In Progress');
    await page.getByLabel('Severity').selectOption('Critical');
    await page.getByLabel('Priority').selectOption('High');
    await page.getByLabel('Assignee Name').fill('QA User');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(row.getByText('In Progress', { exact: true })).toBeVisible();

    const firstSaved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('testnest.defects') ?? '[]')[0],
    );
    expect(firstSaved).toMatchObject({
      status: 'In Progress',
      severity: 'Critical',
      priority: 'High',
      assigneeName: 'QA User',
      createdDate: '2025-01-01T00:00:00.000Z',
    });
    expect(firstSaved.updatedDate).not.toBe('2025-01-01T00:00:00.000Z');

    for (const status of ['Ready for Retest', 'Closed', 'Reopened']) {
      await page.getByRole('button', { name: 'Edit DEF-0001' }).click();
      await page.getByLabel('Status').selectOption(status);
      await page.getByRole('button', { name: 'Save Defect' }).click();
      await expect(row.getByText(status, { exact: true })).toBeVisible();
    }

    const savedBeforeCancel = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('testnest.defects') ?? '[]')[0],
    );
    await page.getByRole('button', { name: 'Edit DEF-0001' }).click();
    await page.getByLabel('Title').fill('Cancelled title');
    await page.getByLabel('Status').selectOption('Closed');
    await page.getByLabel('Severity').selectOption('Low');
    await page.getByLabel('Priority').selectOption('Low');
    await page.getByLabel('Assignee Name').fill('Cancelled assignee');
    await page.getByRole('button', { name: 'Cancel' }).click();

    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('testnest.defects') ?? '[]')[0],
      ),
    ).toEqual(savedBeforeCancel);
    await expect(row.getByText('Reopened', { exact: true })).toBeVisible();
    await expect(row.getByText('Critical', { exact: true })).toBeVisible();
    await expect(row.getByText('High', { exact: true })).toBeVisible();
    await expect(row.getByText('QA User', { exact: true })).toBeVisible();
  });

  test('sorts every supported defect field in ascending and descending order', async ({ page }) => {
    const alpha = makeDefect(1, {
      title: 'Alpha defect',
      status: 'Open',
      severity: 'Critical',
      priority: 'High',
      createdDate: '2026-01-01T00:00:00.000Z',
      updatedDate: '2026-01-02T00:00:00.000Z',
    });
    const zulu = makeDefect(2, {
      title: 'Zulu defect',
      status: 'Reopened',
      severity: 'Low',
      priority: 'Low',
      createdDate: '2026-01-02T00:00:00.000Z',
      updatedDate: '2026-01-01T00:00:00.000Z',
    });
    await seedData(page, { defects: [alpha, zulu] });
    await openDefects(page);

    const table = page.getByRole('table', { name: 'Defects' });
    const firstDataRow = () => table.getByRole('row').nth(1);
    const sortCases = [
      ['Defect ID', 'Alpha defect', 'Zulu defect'],
      ['Title', 'Alpha defect', 'Zulu defect'],
      ['Status', 'Alpha defect', 'Zulu defect'],
      ['Severity', 'Alpha defect', 'Zulu defect'],
      ['Priority', 'Alpha defect', 'Zulu defect'],
      ['Created Date', 'Alpha defect', 'Zulu defect'],
      ['Updated Date', 'Zulu defect', 'Alpha defect'],
    ] as const;

    for (const [label, ascendingTitle, descendingTitle] of sortCases) {
      await page.getByRole('button', { name: `Sort by ${label}` }).click();
      await expect(firstDataRow()).toContainText(ascendingTitle);
      await page
        .getByRole('button', {
          name: `Sort by ${label}, currently ascending`,
        })
        .click();
      await expect(firstDataRow()).toContainText(descendingTitle);
    }

    await expect(page.getByText('2 results')).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(3);
  });

  test('creates a failed-execution defect only after review and preserves source data', async ({ page }) => {
    const automationProject = { ...project, id: 'automation-project', name: 'Automation Project' };
    const automationScenario = { ...scenario, id: 'automation-login', projectId: automationProject.id };
    const automationCase = {
      ...testCase,
      id: 'automation-verify-login',
      projectId: automationProject.id,
      scenarioId: automationScenario.id,
      steps: [
        {
          id: 'automation-click-login',
          description: 'Click Login',
          expectedResult: 'Dashboard is displayed',
        },
      ],
    };
    const execution = {
      id: 'automation-failed-execution',
      executionMode: 'detailed',
      projectId: automationProject.id,
      scenarioId: automationScenario.id,
      testCaseId: automationCase.id,
      overallStatus: 'Failed',
      executionDate: '2026-02-01T10:00:00.000Z',
      notes: 'Acceptance failure.',
      stepResults: [
        {
          testStepId: 'automation-click-login',
          stepNumber: 1,
          stepDescription: 'Click Login',
          expectedResult: 'Dashboard is displayed',
          actualResult: '500 error is displayed',
          status: 'Failed',
        },
      ],
    };
    await seedData(page, {
      projects: [automationProject],
      scenarios: [automationScenario],
      testCases: [automationCase],
      executions: [execution],
    });
    await page.getByRole('button', { name: 'Test Execution' }).click();
    await page.getByLabel('Project').selectOption(automationProject.id);
    await page.getByLabel('Test Scenario').selectOption(automationScenario.id);
    await page.getByLabel('Test Case').selectOption(automationCase.id);
    await page.getByRole('button', { name: /Create defect from Failed execution 1/i }).click();

    await expect(page.getByLabel('Title')).toHaveValue('Verify Login - Click Login failed');
    await expect(page.getByLabel('Linked Project')).toHaveValue(automationProject.id);
    await expect(page.getByLabel('Linked Scenario')).toHaveValue(automationScenario.id);
    await expect(page.getByLabel('Linked Test Case')).toHaveValue(automationCase.id);
    await expect(page.getByLabel('Linked Execution')).toHaveValue(execution.id);
    await expect(page.getByLabel('Linked Test Step')).toHaveValue('automation-click-login');
    await expect(page.getByLabel('Expected Result')).toHaveValue('Dashboard is displayed');
    await expect(page.getByLabel('Actual Result')).toHaveValue('500 error is displayed');
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
      ),
    ).toEqual([]);

    await page.getByLabel('Title').fill('Login submission returns 500');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    const storedData = await page.evaluate(() => ({
      defects: JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
      executions: JSON.parse(localStorage.getItem('testnest.executions') ?? '[]'),
      testCases: JSON.parse(localStorage.getItem('testnest.testCases') ?? '[]'),
    }));
    expect(storedData.defects[0]).toMatchObject({
      title: 'Login submission returns 500',
      projectId: automationProject.id,
      scenarioId: automationScenario.id,
      testCaseId: automationCase.id,
      executionId: execution.id,
      testStepId: 'automation-click-login',
      testStepNumber: 1,
    });
    expect(storedData.executions).toEqual([execution]);
    expect(storedData.testCases).toEqual([automationCase]);
  });

  test('links only the selected failed step from a multi-step execution', async ({ page }) => {
    const multiStepCase = {
      ...testCase,
      id: 'multi-step-case',
      name: 'Submit Login Form',
      steps: [
        { id: 'step-1', description: 'Open Login', expectedResult: 'Login page opens' },
        { id: 'step-2', description: 'Submit Login', expectedResult: 'Dashboard opens' },
        { id: 'step-3', description: 'Open Profile', expectedResult: 'Profile opens' },
      ],
    };
    const execution = {
      id: 'multi-step-execution',
      executionMode: 'detailed',
      projectId: project.id,
      scenarioId: scenario.id,
      testCaseId: multiStepCase.id,
      overallStatus: 'Failed',
      executionDate: '2026-02-02T10:00:00.000Z',
      notes: '',
      stepResults: [
        { testStepId: 'step-1', stepNumber: 1, stepDescription: 'Open Login', expectedResult: 'Login page opens', actualResult: 'Login page opens', status: 'Passed' },
        { testStepId: 'step-2', stepNumber: 2, stepDescription: 'Submit Login', expectedResult: 'Dashboard opens', actualResult: '500 error appears', status: 'Failed' },
        { testStepId: 'step-3', stepNumber: 3, stepDescription: 'Open Profile', expectedResult: 'Profile opens', actualResult: 'Not executed', status: 'No Run' },
      ],
    };
    await seedData(page, {
      projects: [project],
      scenarios: [scenario],
      testCases: [multiStepCase],
      executions: [execution],
    });
    await page.getByRole('button', { name: 'Test Execution' }).click();
    await page.getByLabel('Project').selectOption(project.id);
    await page.getByLabel('Test Scenario').selectOption(scenario.id);
    await page.getByLabel('Test Case').selectOption(multiStepCase.id);
    await page.getByRole('button', { name: 'View execution details 1' }).click();
    await page.getByRole('button', { name: 'Create Defect from Step 2' }).click();

    await expect(page.getByLabel('Linked Test Step')).toHaveValue('step-2');
    await expect(page.getByLabel('Title')).toHaveValue('Submit Login Form - Submit Login failed');
    await expect(page.getByLabel('Expected Result')).toHaveValue('Dashboard opens');
    await expect(page.getByLabel('Actual Result')).toHaveValue('500 error appears');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await page.getByRole('button', { name: 'View DEF-0001' }).click();

    const traceability = page.getByRole('region', { name: 'Traceability' });
    await expect(traceability).toContainText('Step 2: Submit Login');
    await expect(traceability).not.toContainText('Step 1:');
    await expect(traceability).not.toContainText('Step 3:');
  });

  test('deletes only the defect and preserves every linked testing record', async ({ page }) => {
    const execution = makeExecution('Failed');
    const defect = makeDefect(1, {
      projectId: project.id,
      scenarioId: scenario.id,
      testCaseId: testCase.id,
      executionId: execution.id,
      testStepId: 'step-click-login',
      testStepNumber: 1,
    });
    await seedData(page, {
      projects: [project],
      scenarios: [scenario],
      testCases: [testCase],
      executions: [execution],
      defects: [defect],
    });
    await openDefects(page);
    await page.getByRole('button', { name: 'Delete DEF-0001' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('rowheader', { name: 'Defect 01' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete DEF-0001' }).click();
    await page.getByRole('button', { name: 'Delete Defect' }).click();

    const storedData = await page.evaluate(() => ({
      defects: JSON.parse(localStorage.getItem('testnest.defects') ?? '[]'),
      projects: JSON.parse(localStorage.getItem('testnest.projects') ?? '[]'),
      scenarios: JSON.parse(localStorage.getItem('testnest.scenarios') ?? '[]'),
      testCases: JSON.parse(localStorage.getItem('testnest.testCases') ?? '[]'),
      executions: JSON.parse(localStorage.getItem('testnest.executions') ?? '[]'),
    }));
    expect(storedData.defects).toEqual([]);
    expect(storedData.projects).toEqual([project]);
    expect(storedData.scenarios).toEqual([scenario]);
    expect(storedData.testCases).toEqual([testCase]);
    expect(storedData.executions).toEqual([execution]);
    await expect(page.getByLabel('Total Defects: 0')).toBeVisible();
  });

  test('calculates controlled summary counts and persists rich defect data', async ({ page }) => {
    const execution = makeExecution('Failed');
    const records = [
      makeDefect(1, {
        status: 'Open',
        severity: 'Critical',
        projectId: project.id,
        scenarioId: scenario.id,
        testCaseId: testCase.id,
        executionId: execution.id,
        testStepId: 'step-click-login',
        testStepNumber: 1,
        externalSystem: 'Jira',
        externalIssueKey: 'QA-123',
        externalIssueUrl: 'https://example.atlassian.net/browse/QA-123',
      }),
      makeDefect(2, { status: 'Open' }),
      makeDefect(3, { status: 'In Progress' }),
      makeDefect(4, { status: 'Ready for Retest' }),
      makeDefect(5, { status: 'Closed' }),
      makeDefect(6, { status: 'Closed' }),
    ];
    await seedData(page, {
      projects: [project],
      scenarios: [scenario],
      testCases: [testCase],
      executions: [execution],
      defects: records,
    });
    await openDefects(page);

    await expect(page.getByLabel('Total Defects: 6')).toBeVisible();
    await expect(page.getByLabel('Open: 2')).toBeVisible();
    await expect(page.getByLabel('In Progress: 1')).toBeVisible();
    await expect(page.getByLabel('Ready for Retest: 1')).toBeVisible();
    await expect(page.getByLabel('Closed: 2')).toBeVisible();
    await expect(page.getByLabel('Critical: 1')).toBeVisible();

    await page.getByLabel('Filter by Status').selectOption('Closed');
    await expect(page.getByText('2 results')).toBeVisible();
    await page.reload();
    await openDefects(page);
    await expect(page.getByLabel('Filter by Status')).toHaveValue('all');
    await expect(page.getByLabel('Total Defects: 6')).toBeVisible();

    await page.getByRole('button', { name: 'View DEF-0001' }).click();
    const traceability = page.getByRole('region', { name: 'Traceability' });
    await expect(traceability).toContainText(project.name);
    await expect(traceability).toContainText(testCase.name);
    await expect(traceability).toContainText('Step 1: Click Login');
    await expect(page.getByText('QA-123', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close Details' }).click();

    await page.getByRole('button', { name: 'Edit DEF-0002' }).click();
    await page.getByLabel('Status').selectOption('Closed');
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await expect(page.getByLabel('Open: 1')).toBeVisible();
    await expect(page.getByLabel('Closed: 3')).toBeVisible();
  });

  test('creating and deleting a defect does not change its linked execution', async ({ page }) => {
    const execution = makeExecution('Failed');
    await seedData(page, {
      projects: [project],
      scenarios: [scenario],
      testCases: [testCase],
      executions: [execution],
    });
    await selectExecutionContext(page);
    await page.getByRole('button', { name: /Create defect from Failed execution 1/i }).click();
    await page.getByRole('button', { name: 'Save Defect' }).click();
    await page.getByRole('button', { name: 'Delete DEF-0001' }).click();
    await page.getByRole('button', { name: 'Delete Defect' }).click();

    const storedExecutions = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('testnest.executions') ?? '[]'),
    );
    expect(storedExecutions).toEqual([execution]);
  });
});
