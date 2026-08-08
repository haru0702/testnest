import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { read, utils, write } from '@e965/xlsx';

const importColumns = [
  'Project Name',
  'Scenario Name',
  'Test Case Name',
  'Test Description',
  'Precondition',
  'Step Number',
  'Step Description',
  'Expected Result',
];

const exportColumns = [
  'Project Name',
  'Scenario Name',
  'Test Case ID',
  'Test Case Name',
  'Test Description',
  'Precondition',
  'Step Number',
  'Step Description',
  'Expected Result',
  'Latest Execution Status',
  'Created Date',
  'Updated Date',
];

const now = '2026-08-08T08:00:00.000Z';
const project = {
  id: 'project-1',
  name: 'QA Platform',
  description: 'Primary QA project.',
  status: 'Active',
  createdDate: now,
  updatedDate: now,
};
const scenario = {
  id: 'scenario-1',
  projectId: project.id,
  name: 'Login',
  description: 'Authentication coverage.',
  createdDate: now,
  updatedDate: now,
};

type SeedTestCase = {
  id: string;
  name: string;
  description: string;
  precondition: string;
  projectId: string;
  scenarioId: string;
  steps: Array<{ id: string; description: string; expectedResult: string }>;
  createdDate: string;
  updatedDate: string;
};

function testCase(
  id: string,
  name: string,
  overrides: Partial<SeedTestCase> = {},
): SeedTestCase {
  return {
    id,
    name,
    description: `${name} description`,
    precondition: `${name} precondition`,
    projectId: project.id,
    scenarioId: scenario.id,
    steps: [
      {
        id: `${id}-step-1`,
        description: `${name} step`,
        expectedResult: `${name} result`,
      },
    ],
    createdDate: now,
    updatedDate: now,
    ...overrides,
  };
}

async function seedTestData(
  page: Page,
  options: {
    projects?: unknown[];
    scenarios?: unknown[];
    testCases?: SeedTestCase[];
    executions?: unknown[];
  } = {},
) {
  await page.goto('/');
  await page.evaluate(
    ({ projects, scenarios, testCases, executions }) => {
      localStorage.setItem('testnest.projects', JSON.stringify(projects));
      localStorage.setItem('testnest.scenarios', JSON.stringify(scenarios));
      localStorage.setItem('testnest.testCases', JSON.stringify(testCases));
      localStorage.setItem('testnest.executions', JSON.stringify(executions));
    },
    {
      projects: options.projects ?? [project],
      scenarios: options.scenarios ?? [scenario],
      testCases: options.testCases ?? [],
      executions: options.executions ?? [],
    },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Test Cases' }).click();
}

async function createProjectAndScenario(
  page: Page,
  projectName = project.name,
  scenarioName = scenario.name,
) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.getByLabel('Project Name').fill(projectName);
  await page.getByLabel('Description').fill('Import acceptance project.');
  await page.getByRole('button', { name: 'Save Project' }).click();

  await page.getByRole('button', { name: 'Test Cases' }).click();
  await page.getByLabel('Project').selectOption({ label: projectName });
  await page.getByRole('button', { name: 'Create Scenario' }).click();
  await page.getByLabel('Scenario Name').fill(scenarioName);
  await page.getByLabel('Description').fill('Import acceptance scenario.');
  await page.getByRole('button', { name: 'Save Scenario' }).click();
  await page.getByRole('button', { name: `Open ${scenarioName}` }).click();
}

async function storedTestCases(page: Page) {
  return page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem('testnest.testCases') ?? '[]',
      ) as SeedTestCase[],
  );
}

async function createWorkbookFixture(
  testInfo: TestInfo,
  name: string,
  rows: unknown[][],
  columns: string[] = importColumns,
) {
  const workbook = utils.book_new();
  const worksheet = utils.aoa_to_sheet([columns, ...rows]);
  const path = testInfo.outputPath(`${name}.xlsx`);

  utils.book_append_sheet(workbook, worksheet, 'Test Cases');
  const data = write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;
  await writeFile(path, new Uint8Array(data));
  return path;
}

async function openImport(page: Page) {
  await page.getByRole('button', { name: 'Import Test Cases' }).click();
  await expect(
    page.getByRole('heading', { level: 3, name: 'Import Test Cases' }),
  ).toBeVisible();
}

async function uploadWorkbook(page: Page, path: string) {
  await page.getByLabel('Excel file').setInputFiles(path);
  await expect(
    page.getByRole('heading', { level: 4, name: 'Import Preview' }),
  ).toBeVisible();
}

async function selectScenario(page: Page) {
  await page.getByLabel('Project').selectOption({ label: project.name });
  await page
    .getByLabel('Test Scenario', { exact: true })
    .selectOption({ label: scenario.name });
}

async function downloadedRows(downloadPath: string) {
  const workbook = read(await readFile(downloadPath), { type: 'buffer' });
  const worksheet = workbook.Sheets['Test Cases'];

  if (!worksheet) {
    throw new Error('Downloaded workbook is missing the Test Cases sheet.');
  }

  return {
    workbook,
    rows: utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    }),
  };
}

function worksheetRows(
  workbook: ReturnType<typeof read>,
  worksheetName: string,
) {
  const worksheet = workbook.Sheets[worksheetName];

  if (!worksheet) {
    throw new Error(`Downloaded workbook is missing ${worksheetName}.`);
  }

  return utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });
}

test.describe('Test Case import and export', () => {
  test('downloads an import template with example and instructions sheets', async ({
    page,
  }) => {
    await seedTestData(page);
    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download Import Template' })
      .click();
    const download = await downloadPromise;
    const path = await download.path();

    expect(download.suggestedFilename()).toBe(
      'testnest-test-case-import-template.xlsx',
    );
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    expect(path).not.toBeNull();
    const { workbook, rows } = await downloadedRows(path!);
    expect(workbook.SheetNames).toEqual(['Test Cases', 'Instructions']);
    expect(rows[0]).toEqual(importColumns);
    expect(rows[1]?.[2]).toBe('Valid Login');
    expect(rows[2]?.[2]).toBe('Valid Login');
    expect(rows.slice(1).map((row) => row[5])).toEqual(['1', '2']);

    const instructions = worksheetRows(workbook, 'Instructions')
      .flat()
      .join(' ')
      .toLocaleLowerCase();
    expect(instructions).toContain('required');
    expect(instructions).toContain('projects and scenarios must already exist');
    expect(instructions).toContain('one excel row per test step');
    expect(instructions).toContain('unique within a scenario');
    expect(instructions).toContain('step number must be a positive integer');
  });

  test('opens and cancels the import workflow without saving', async ({
    page,
  }, testInfo) => {
    const existingCase = testCase('case-existing', 'Existing Case');
    const fixture = await createWorkbookFixture(testInfo, 'cancel-import', [
      [
        project.name,
        scenario.name,
        'Cancelled Case',
        '',
        '',
        1,
        'Attempt action',
        'Action succeeds',
      ],
    ]);
    await seedTestData(page, { testCases: [existingCase] });
    await selectScenario(page);
    const countBeforeImport = (await storedTestCases(page)).length;
    await expect(
      page.getByRole('rowheader', { name: existingCase.name }),
    ).toBeVisible();
    await openImport(page);
    await uploadWorkbook(page, fixture);
    await page.getByRole('button', { name: 'Cancel Import' }).click();

    await expect(
      page.getByRole('heading', { level: 3, name: 'Import Test Cases' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('rowheader', { name: existingCase.name }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Cancelled Case' }),
    ).toHaveCount(0);
    expect(await storedTestCases(page)).toHaveLength(countBeforeImport);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(
      page.getByLabel(`Total Test Cases: ${countBeforeImport}`),
    ).toBeVisible();
  });

  test('previews and imports one multi-step Test Case, then updates Dashboard', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(testInfo, 'valid-import', [
      [
        `  ${project.name}  `,
        scenario.name,
        '  Valid Login  ',
        '  Verify valid login  ',
        '  An active user exists  ',
        2,
        '  Submit the form  ',
        '  Dashboard appears  ',
      ],
      [
        project.name,
        scenario.name,
        'Valid Login',
        'Verify valid login',
        'An active user exists',
        1,
        'Enter credentials',
        'Credentials are accepted',
      ],
    ]);
    await seedTestData(page);
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(page.getByLabel('Test Cases detected: 1')).toBeVisible();
    await expect(page.getByLabel('Test Steps detected: 2')).toBeVisible();
    await expect(page.getByLabel('Valid Test Cases: 1')).toBeVisible();
    const previewRow = page
      .getByRole('table', { name: 'Test Case Import Preview' })
      .getByRole('row')
      .filter({ hasText: 'Valid Login' });
    await expect(previewRow).toContainText('2');
    await expect(previewRow).toContainText('Ready to import');

    await page.getByRole('button', { name: 'Import Valid Test Cases' }).click();
    await expect(page.getByRole('status')).toContainText(
      '1 Test Case was imported.',
    );
    await expect(
      page.getByRole('rowheader', { name: 'Valid Login' }),
    ).toBeVisible();
    await expect(page.getByText('2 steps', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByLabel('Total Test Cases: 1')).toBeVisible();
  });

  test('imports two valid three-step Test Cases and persists their ordered steps', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(
      testInfo,
      'valid-multi-case-import',
      [
        [
          project.name,
          scenario.name,
          'Valid Login',
          'Verify login using valid credentials',
          'User has an active account',
          2,
          'Enter valid password',
          'Password is masked',
        ],
        [
          project.name,
          scenario.name,
          'Valid Login',
          'Verify login using valid credentials',
          'User has an active account',
          1,
          'Enter valid username',
          'Username is accepted',
        ],
        [
          project.name,
          scenario.name,
          'Valid Login',
          'Verify login using valid credentials',
          'User has an active account',
          3,
          'Click Login',
          'Dashboard is displayed',
        ],
        [
          project.name,
          scenario.name,
          'Logout',
          'Verify successful logout',
          'User is logged in',
          3,
          'Verify session ended',
          'Protected page cannot be accessed',
        ],
        [
          project.name,
          scenario.name,
          'Logout',
          'Verify successful logout',
          'User is logged in',
          1,
          'Open user menu',
          'User menu is displayed',
        ],
        [
          project.name,
          scenario.name,
          'Logout',
          'Verify successful logout',
          'User is logged in',
          2,
          'Click Logout',
          'User returns to login page',
        ],
      ],
    );

    await createProjectAndScenario(page);
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(page.getByLabel('Test Cases detected: 2')).toBeVisible();
    await expect(page.getByLabel('Test Steps detected: 6')).toBeVisible();
    await expect(page.getByLabel('Valid Test Cases: 2')).toBeVisible();
    await expect(page.getByLabel('Duplicate Test Cases: 0')).toBeVisible();
    await expect(page.getByLabel('Invalid Test Cases: 0')).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Valid Login' }),
    ).toHaveCount(1);
    await expect(page.getByRole('rowheader', { name: 'Logout' })).toHaveCount(
      1,
    );
    await expect(
      page.getByRole('table', { name: 'Scenario Test Cases' }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Import Valid Test Cases' }).click();

    const table = page.getByRole('table', { name: 'Scenario Test Cases' });
    await expect(
      table.getByRole('rowheader', { name: 'Valid Login' }),
    ).toBeVisible();
    await expect(
      table.getByRole('rowheader', { name: 'Logout' }),
    ).toBeVisible();
    const imported = await storedTestCases(page);
    expect(imported).toHaveLength(2);
    expect(imported.find((item) => item.name === 'Valid Login')).toMatchObject({
      description: 'Verify login using valid credentials',
      precondition: 'User has an active account',
      steps: [
        {
          description: 'Enter valid username',
          expectedResult: 'Username is accepted',
        },
        {
          description: 'Enter valid password',
          expectedResult: 'Password is masked',
        },
        {
          description: 'Click Login',
          expectedResult: 'Dashboard is displayed',
        },
      ],
    });
    expect(imported.find((item) => item.name === 'Logout')).toMatchObject({
      description: 'Verify successful logout',
      precondition: 'User is logged in',
      steps: [
        {
          description: 'Open user menu',
          expectedResult: 'User menu is displayed',
        },
        {
          description: 'Click Logout',
          expectedResult: 'User returns to login page',
        },
        {
          description: 'Verify session ended',
          expectedResult: 'Protected page cannot be accessed',
        },
      ],
    });

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByLabel('Total Test Cases: 2')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Total Test Cases: 2')).toBeVisible();
    await page.getByRole('button', { name: 'Test Cases' }).click();
    await page.getByLabel('Project').selectOption({ label: project.name });
    await page
      .getByLabel('Test Scenario', { exact: true })
      .selectOption({ label: scenario.name });
    await expect(
      page.getByRole('rowheader', { name: 'Valid Login' }),
    ).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Logout' })).toBeVisible();
  });

  test('marks an existing case-insensitive Test Case name as duplicate', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(testInfo, 'duplicate-import', [
      [
        project.name,
        scenario.name,
        '  VALID LOGIN  ',
        '',
        '',
        1,
        'Act',
        'Pass',
      ],
    ]);
    await seedTestData(page, {
      testCases: [testCase('case-existing', 'Valid Login')],
    });
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(page.getByLabel('Duplicate Test Cases: 1')).toBeVisible();
    await expect(
      page.getByText(
        'Test Case "VALID LOGIN" already exists in Scenario "Login".',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Import Valid Test Cases' }),
    ).toBeDisabled();
  });

  test('shows row-level validation for an unknown Project', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(testInfo, 'unknown-project', [
      [
        'Missing Project',
        scenario.name,
        'Unknown Project Case',
        '',
        '',
        1,
        'Act',
        'Pass',
      ],
    ]);
    await seedTestData(page);
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(
      page.getByText('Row 2: Project "Missing Project" does not exist.'),
    ).toBeVisible();
    await expect(page.getByLabel('Invalid Test Cases: 1')).toBeVisible();
  });

  test('shows row-level validation for an unknown Scenario', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(testInfo, 'unknown-scenario', [
      [
        project.name,
        'Missing Scenario',
        'Unknown Scenario Case',
        '',
        '',
        1,
        'Act',
        'Pass',
      ],
    ]);
    await seedTestData(page);
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(
      page.getByText(
        'Row 2: Scenario "Missing Scenario" does not exist under Project "QA Platform".',
      ),
    ).toBeVisible();
  });

  test('rejects an invalid Step Number without partially importing the case', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(testInfo, 'invalid-step', [
      [
        project.name,
        scenario.name,
        'Invalid Steps',
        '',
        '',
        1,
        'Valid action',
        'Pass',
      ],
      [
        project.name,
        scenario.name,
        'Invalid Steps',
        '',
        '',
        0,
        'Invalid action',
        'Pass',
      ],
    ]);
    await seedTestData(page);
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(
      page.getByText('Row 3: Step Number must be a positive integer.'),
    ).toBeVisible();
    await expect(page.getByLabel('Invalid Test Cases: 1')).toBeVisible();
    await expect(page.getByLabel('Valid Test Cases: 0')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Import Valid Test Cases' }),
    ).toBeDisabled();
  });

  test('imports only valid groups from a mixed valid, duplicate, and invalid workbook', async ({
    page,
  }, testInfo) => {
    const fixture = await createWorkbookFixture(testInfo, 'mixed-import', [
      [
        project.name,
        scenario.name,
        'Password Reset',
        'Verify password recovery',
        'A registered user exists',
        2,
        'Open reset link',
        'Password form opens',
      ],
      [
        project.name,
        scenario.name,
        'Password Reset',
        'Verify password recovery',
        'A registered user exists',
        1,
        'Request reset link',
        'Reset link is sent',
      ],
      [
        'Project That Does Not Exist',
        scenario.name,
        'Unknown Project Case',
        '',
        '',
        1,
        'Act',
        'Pass',
      ],
      [
        project.name,
        'Scenario That Does Not Exist',
        'Unknown Scenario Case',
        '',
        '',
        1,
        'Act',
        'Pass',
      ],
      [
        project.name,
        scenario.name,
        '  EXISTING CASE  ',
        '',
        '',
        1,
        'Act',
        'Pass',
      ],
      [
        project.name,
        scenario.name,
        'Nonpositive Step',
        '',
        '',
        0,
        'Act',
        'Pass',
      ],
      [
        project.name,
        scenario.name,
        'Duplicate Step Numbers',
        '',
        '',
        1,
        'First action',
        'First result',
      ],
      [
        project.name,
        scenario.name,
        'Duplicate Step Numbers',
        '',
        '',
        1,
        'Second action',
        'Second result',
      ],
      [
        project.name,
        scenario.name,
        'Missing Description',
        '',
        '',
        1,
        'Valid first action',
        'First result',
      ],
      [
        project.name,
        scenario.name,
        'Missing Description',
        '',
        '',
        2,
        '',
        'Second result',
      ],
      [
        project.name,
        scenario.name,
        'Missing Expected Result',
        '',
        '',
        1,
        'Valid first action',
        'First result',
      ],
      [
        project.name,
        scenario.name,
        'Missing Expected Result',
        '',
        '',
        2,
        'Second action',
        '',
      ],
    ]);
    await seedTestData(page, {
      testCases: [testCase('case-existing', 'Existing Case')],
    });
    await openImport(page);
    await uploadWorkbook(page, fixture);

    await expect(page.getByLabel('Test Cases detected: 8')).toBeVisible();
    await expect(page.getByLabel('Test Steps detected: 12')).toBeVisible();
    await expect(page.getByLabel('Valid Test Cases: 1')).toBeVisible();
    await expect(page.getByLabel('Duplicate Test Cases: 1')).toBeVisible();
    await expect(page.getByLabel('Invalid Test Cases: 6')).toBeVisible();

    const preview = page.getByRole('table', {
      name: 'Test Case Import Preview',
    });
    await expect(
      preview.getByRole('row').filter({ hasText: 'Password Reset' }),
    ).toContainText('valid');
    await expect(
      preview.getByRole('row').filter({ hasText: 'EXISTING CASE' }),
    ).toContainText('duplicate');
    for (const invalidCaseName of [
      'Unknown Project Case',
      'Unknown Scenario Case',
      'Nonpositive Step',
      'Duplicate Step Numbers',
      'Missing Description',
      'Missing Expected Result',
    ]) {
      await expect(
        preview.getByRole('row').filter({ hasText: invalidCaseName }),
      ).toContainText('invalid');
    }

    await expect(
      page.getByText(
        'Row 4: Project "Project That Does Not Exist" does not exist.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Row 5: Scenario "Scenario That Does Not Exist" does not exist under Project "QA Platform".',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Row 6: Test Case "EXISTING CASE" already exists in Scenario "Login".',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Row 7: Step Number must be a positive integer.'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Rows 8-9: Step Number 1 is duplicated within Test Case "Duplicate Step Numbers".',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Row 11: Step Description is required.'),
    ).toBeVisible();
    await expect(
      page.getByText('Row 13: Expected Result is required.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Import Valid Test Cases' }).click();

    const savedCases = await storedTestCases(page);
    expect(savedCases.map((item) => item.name).sort()).toEqual([
      'Existing Case',
      'Password Reset',
    ]);
    expect(
      savedCases.find((item) => item.name === 'Password Reset')?.steps,
    ).toMatchObject([
      { description: 'Request reset link' },
      { description: 'Open reset link' },
    ]);
    await expect(
      page.getByRole('rowheader', { name: 'Password Reset' }),
    ).toBeVisible();
    for (const rejectedCaseName of [
      'Unknown Project Case',
      'Unknown Scenario Case',
      'EXISTING CASE',
      'Nonpositive Step',
      'Duplicate Step Numbers',
      'Missing Description',
      'Missing Expected Result',
    ]) {
      await expect(
        page.getByRole('rowheader', { name: rejectedCaseName, exact: true }),
      ).toHaveCount(0);
    }
    expect(
      savedCases.filter(
        (item) => item.name.toLocaleLowerCase() === 'existing case',
      ),
    ).toHaveLength(1);
  });

  test('exports all Test Cases across project and scenario context', async ({
    page,
  }) => {
    const secondProject = { ...project, id: 'project-2', name: 'Mobile App' };
    const secondScenario = {
      ...scenario,
      id: 'scenario-2',
      projectId: secondProject.id,
      name: 'Checkout',
    };
    const firstCase = testCase('case-1', 'Valid Login', {
      steps: [
        {
          id: 'step-1',
          description: 'Enter credentials',
          expectedResult: 'Accepted',
        },
        {
          id: 'step-2',
          description: 'Submit',
          expectedResult: 'Dashboard appears',
        },
      ],
    });
    const secondCase = testCase('case-2', 'Place Order', {
      projectId: secondProject.id,
      scenarioId: secondScenario.id,
    });
    await seedTestData(page, {
      projects: [project, secondProject],
      scenarios: [scenario, secondScenario],
      testCases: [firstCase, secondCase],
    });
    await selectScenario(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export All' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    expect(path).not.toBeNull();
    const { rows } = await downloadedRows(path!);

    expect(rows[0]).toEqual(exportColumns);
    expect(rows).toHaveLength(4);
    expect(rows.slice(1).map((row) => row[3])).toEqual([
      'Valid Login',
      'Valid Login',
      'Place Order',
    ]);
    expect(rows.slice(1).map((row) => row[0])).toContain('Mobile App');
    const validLoginRows = rows
      .slice(1)
      .filter((row) => row[3] === 'Valid Login');
    expect(validLoginRows).toHaveLength(2);
    expect(validLoginRows.map((row) => row[2])).toEqual([
      firstCase.id,
      firstCase.id,
    ]);
    expect(validLoginRows.map((row) => row[6])).toEqual(['1', '2']);
    expect(validLoginRows.map((row) => row[7])).toEqual([
      'Enter credentials',
      'Submit',
    ]);
    expect(validLoginRows.map((row) => row[4])).toEqual([
      firstCase.description,
      firstCase.description,
    ]);
    expect(validLoginRows.map((row) => row[5])).toEqual([
      firstCase.precondition,
      firstCase.precondition,
    ]);
    expect(rows.find((row) => row[3] === 'Place Order')?.[2]).toBe(
      secondCase.id,
    );
  });

  test('exports only Test Cases matching context, search, and latest status', async ({
    page,
  }) => {
    const secondProject = { ...project, id: 'project-2', name: 'Mobile App' };
    const checkoutScenario = {
      ...scenario,
      id: 'scenario-2',
      name: 'Checkout',
    };
    const mobileScenario = {
      ...scenario,
      id: 'scenario-3',
      projectId: secondProject.id,
      name: 'Device Login',
    };
    const alpha = testCase('case-alpha', 'Alpha Login', {
      steps: [
        {
          id: 'alpha-step-1',
          description: 'Enter credentials',
          expectedResult: 'Credentials are accepted',
        },
        {
          id: 'alpha-step-2',
          description: 'Submit login',
          expectedResult: 'Dashboard appears',
        },
      ],
    });
    const beta = testCase('case-beta', 'Beta Login');
    const checkout = testCase('case-checkout', 'Checkout Payment', {
      scenarioId: checkoutScenario.id,
    });
    const mobile = testCase('case-mobile', 'Mobile Login', {
      projectId: secondProject.id,
      scenarioId: mobileScenario.id,
    });
    await seedTestData(page, {
      projects: [project, secondProject],
      scenarios: [scenario, checkoutScenario, mobileScenario],
      testCases: [alpha, beta, checkout, mobile],
      executions: [
        {
          id: 'execution-beta',
          executionMode: 'quick',
          projectId: project.id,
          scenarioId: scenario.id,
          testCaseId: beta.id,
          overallStatus: 'Failed',
          executionDate: '2026-08-08T09:00:00.000Z',
          notes: '',
          stepResults: [],
        },
      ],
    });
    await selectScenario(page);
    await page.getByLabel('Search test cases').fill('Alpha');
    await page.getByLabel('Filter by Latest Status').selectOption('No Run');
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: alpha.name }),
    ).toBeVisible();
    for (const filteredOutName of [beta.name, checkout.name, mobile.name]) {
      await expect(
        page.getByRole('rowheader', {
          name: filteredOutName,
          exact: true,
        }),
      ).toHaveCount(0);
    }

    const filteredDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Filtered' }).click();
    const filteredDownload = await filteredDownloadPromise;
    const filteredPath = await filteredDownload.path();
    expect(filteredPath).not.toBeNull();
    const { rows: filteredRows } = await downloadedRows(filteredPath!);

    expect(filteredRows).toHaveLength(3);
    expect(filteredRows.slice(1).map((row) => row[0])).toEqual([
      project.name,
      project.name,
    ]);
    expect(filteredRows.slice(1).map((row) => row[1])).toEqual([
      scenario.name,
      scenario.name,
    ]);
    expect(filteredRows.slice(1).map((row) => row[3])).toEqual([
      alpha.name,
      alpha.name,
    ]);
    expect(filteredRows.slice(1).map((row) => row[6])).toEqual(['1', '2']);
    expect(filteredRows.slice(1).map((row) => row[9])).toEqual([
      'No Run',
      'No Run',
    ]);
    expect(
      filteredRows.some((row) =>
        [beta.name, checkout.name, mobile.name].includes(String(row[3])),
      ),
    ).toBe(false);

    const allDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export All' }).click();
    const allDownload = await allDownloadPromise;
    const allPath = await allDownload.path();
    expect(allPath).not.toBeNull();
    const { rows: allRows } = await downloadedRows(allPath!);
    expect(allRows).toHaveLength(6);
    expect(new Set(allRows.slice(1).map((row) => row[3]))).toEqual(
      new Set([alpha.name, beta.name, checkout.name, mobile.name]),
    );
    expect(allRows.slice(1).map((row) => row[0])).toContain(secondProject.name);
    expect(allRows.slice(1).map((row) => row[1])).toContain(
      checkoutScenario.name,
    );
  });

  test('keeps search, status filtering, sorting, and pagination working after import', async ({
    page,
  }, testInfo) => {
    const secondProject = { ...project, id: 'project-2', name: 'Mobile App' };
    const checkoutScenario = {
      ...scenario,
      id: 'scenario-2',
      name: 'Checkout',
    };
    const mobileScenario = {
      ...scenario,
      id: 'scenario-3',
      projectId: secondProject.id,
      name: 'Mobile Coverage',
    };
    const loginRows = Array.from({ length: 11 }, (_, index) => {
      const caseNumber = String(index + 1).padStart(2, '0');
      return [
        project.name,
        scenario.name,
        `Imported Case ${caseNumber}`,
        `Description ${caseNumber}`,
        '',
        1,
        `Step ${caseNumber}`,
        `Result ${caseNumber}`,
      ];
    });
    const rows = [
      ...loginRows,
      [
        project.name,
        checkoutScenario.name,
        'Imported Checkout Case',
        'Checkout coverage',
        '',
        1,
        'Complete checkout',
        'Order is placed',
      ],
      [
        secondProject.name,
        mobileScenario.name,
        'Imported Mobile Case',
        'Mobile coverage',
        '',
        1,
        'Open the mobile app',
        'The app opens',
      ],
    ];
    const fixture = await createWorkbookFixture(
      testInfo,
      'table-regression',
      rows,
    );
    await seedTestData(page, {
      projects: [project, secondProject],
      scenarios: [scenario, checkoutScenario, mobileScenario],
    });
    await openImport(page);
    await uploadWorkbook(page, fixture);
    await page.getByRole('button', { name: 'Import Valid Test Cases' }).click();

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();

    await page.getByLabel('Search test cases').fill('Imported Case 11');
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await page.getByLabel('Filter by Latest Status').selectOption('Passed');
    await expect(
      page.getByText('No test cases match your filters.'),
    ).toBeVisible();
    await page.getByLabel('Filter by Latest Status').selectOption('No Run');
    await expect(page.getByText('11 results', { exact: true })).toBeVisible();

    const table = page.getByRole('table', { name: 'Scenario Test Cases' });
    await page.getByRole('button', { name: /Sort by Test Case Name/ }).click();
    await expect(table.getByRole('row').nth(1)).toContainText(
      'Imported Case 01',
    );
    await page.getByRole('button', { name: /Sort by Test Case Name/ }).click();
    await expect(table.getByRole('row').nth(1)).toContainText(
      'Imported Case 11',
    );

    await page
      .getByLabel('Test Scenario', { exact: true })
      .selectOption({ label: checkoutScenario.name });
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Imported Checkout Case' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Imported Case 11' }),
    ).toHaveCount(0);

    await page
      .getByLabel('Project')
      .selectOption({ label: secondProject.name });
    await page
      .getByLabel('Test Scenario', { exact: true })
      .selectOption({ label: mobileScenario.name });
    await expect(
      page.getByRole('rowheader', { name: 'Imported Mobile Case' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Imported Checkout Case' }),
    ).toHaveCount(0);

    await page.getByLabel('Project').selectOption({ label: project.name });
    await page
      .getByLabel('Test Scenario', { exact: true })
      .selectOption({ label: scenario.name });
    await expect(page.getByText('11 results', { exact: true })).toBeVisible();
  });
});
