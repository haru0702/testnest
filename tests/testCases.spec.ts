import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, name = 'QA Platform') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.getByLabel('Project Name').fill(name);
  await page.getByLabel('Description').fill('Project-level QA coverage.');
  await page.getByRole('button', { name: 'Save Project' }).click();
}

async function selectProject(page: Page, name = 'QA Platform') {
  await page.getByRole('button', { name: 'Test Cases' }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Test Cases' }),
  ).toBeVisible();
  await page.getByLabel('Project').selectOption({ label: name });
  await expect(
    page.getByRole('heading', { level: 3, name: 'Test Scenarios' }),
  ).toBeVisible();
}

async function prepareProject(page: Page, name = 'QA Platform') {
  await createProject(page, name);
  await selectProject(page, name);
}

async function createScenario(
  page: Page,
  name = 'Login',
  description = 'Authentication coverage.',
) {
  await page.getByRole('button', { name: 'Create Scenario' }).click();
  await page.getByLabel('Scenario Name').fill(name);
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Save Scenario' }).click();
}

async function openScenario(page: Page, name = 'Login') {
  await page.getByRole('button', { name: `Open ${name}` }).click();
  await expect(
    page.getByRole('heading', { level: 3, name }),
  ).toBeVisible();
}

async function createTestCase(
  page: Page,
  name = 'Valid credentials',
  stepDescription = 'Enter valid credentials',
  expectedResult = 'The user is signed in',
  description = 'Successful login coverage.',
  precondition = 'A registered user exists.',
) {
  await page.getByRole('button', { name: 'Create Test Case' }).click();
  await page.getByLabel('Test Case Name').fill(name);
  await page.getByLabel('Test Description').fill(description);
  await page.getByLabel('Precondition').fill(precondition);
  await page.getByLabel('Step 1 Description').fill(stepDescription);
  await page.getByLabel('Step 1 Expected Result').fill(expectedResult);
  await page.getByRole('button', { name: 'Save Test Case' }).click();
}

async function prepareScenario(page: Page) {
  await prepareProject(page);
  await createScenario(page);
  await openScenario(page);
}

test.describe('Test scenario and test case management', () => {
  test('opens the Test Cases page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Test Cases' }).click();

    await expect(
      page.getByRole('heading', { level: 2, name: 'Test Cases' }),
    ).toBeVisible();
    await expect(page.getByLabel('Project')).toBeVisible();
    await expect(page.getByText('No projects available')).toBeVisible();
  });

  test('selects a project and displays its scenario workspace', async ({
    page,
  }) => {
    await prepareProject(page, 'Customer Portal');

    await expect(page.getByLabel('Project')).toHaveValue(/.+/);
    await expect(page.getByText('No scenarios yet')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Scenario' }),
    ).toBeVisible();
  });

  test('creates a scenario and trims its fields', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page, '  Login  ', '  Authentication coverage.  ');

    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();
    await expect(page.getByText('Authentication coverage.')).toBeVisible();
  });

  test('requires a scenario name', async ({ page }) => {
    await prepareProject(page);
    await page.getByRole('button', { name: 'Create Scenario' }).click();
    await page.getByLabel('Scenario Name').fill('   ');
    await page.getByRole('button', { name: 'Save Scenario' }).click();

    await expect(page.getByText('Scenario Name is required.')).toBeVisible();
    await expect(page.getByLabel('Scenario Name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('edits a scenario', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page);
    await page.getByRole('button', { name: 'Edit Login' }).click();
    await page.getByLabel('Scenario Name').fill('Authentication');
    await page.getByLabel('Description').fill('Updated auth coverage.');
    await page.getByRole('button', { name: 'Save Scenario' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Authentication' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Login', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText('Updated auth coverage.')).toBeVisible();
  });

  test('cancels scenario creation and editing without saving', async ({
    page,
  }) => {
    await prepareProject(page);
    await page.getByRole('button', { name: 'Create Scenario' }).click();
    await page.getByLabel('Scenario Name').fill('Unsaved Scenario');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('No scenarios yet')).toBeVisible();

    await createScenario(page);
    await page.getByRole('button', { name: 'Edit Login' }).click();
    await page.getByLabel('Scenario Name').fill('Changed Login');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();
    await expect(page.getByText('Changed Login')).toHaveCount(0);
  });

  test('prevents duplicate scenarios within a project', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page);
    await page.getByRole('button', { name: 'Create Scenario' }).click();
    await page.getByLabel('Scenario Name').fill('  LOGIN  ');
    await page.getByRole('button', { name: 'Save Scenario' }).click();

    await expect(
      page.getByText(
        'A scenario with this name already exists in this project.',
      ),
    ).toBeVisible();
  });

  test('cancels and confirms scenario deletion', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page);
    await page.getByRole('button', { name: 'Delete Login' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete Login' }).click();
    await page.getByRole('button', { name: 'Delete Scenario' }).click();
    await expect(page.getByText('No scenarios yet')).toBeVisible();
  });

  test('searches scenarios by name and description', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page, 'Login', 'Authentication coverage.');
    await createScenario(page, 'Checkout', 'Purchase flow coverage.');
    await page.getByLabel('Search scenarios').fill('  LOG  ');

    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Checkout' }),
    ).toHaveCount(0);

    await page.getByLabel('Search scenarios').fill('purchase');
    await expect(
      page.getByRole('rowheader', { name: 'Checkout' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Login' }),
    ).toHaveCount(0);
  });

  test('filters scenarios by the selected project', async ({ page }) => {
    await prepareProject(page, 'Customer Portal');
    await createScenario(page, 'Login');
    await createProject(page, 'Mobile App');
    await selectProject(page, 'Mobile App');
    await createScenario(page, 'Device permissions');

    await page
      .getByLabel('Project')
      .selectOption({ label: 'Customer Portal' });
    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Device permissions' }),
    ).toHaveCount(0);
  });

  test('sorts scenarios by name in both directions', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page, 'Zulu Scenario');
    await createScenario(page, 'Alpha Scenario');
    const table = page.getByRole('table', { name: 'Test Scenarios' });

    await page.getByRole('button', { name: /Sort by Scenario Name/ }).click();
    await expect(table.getByRole('row').nth(1)).toContainText('Alpha Scenario');
    await page.getByRole('button', { name: /Sort by Scenario Name/ }).click();
    await expect(table.getByRole('row').nth(1)).toContainText('Zulu Scenario');
  });

  test('creates a test case', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page);

    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toBeVisible();
    await expect(page.getByText('Successful login coverage.')).toBeVisible();
    await expect(page.getByText('A registered user exists.')).toBeVisible();
  });

  test('creates a test case with multiple numbered steps', async ({ page }) => {
    await prepareScenario(page);
    await page.getByRole('button', { name: 'Create Test Case' }).click();
    await page.getByLabel('Test Case Name').fill('Password recovery');
    await page.getByLabel('Step 1 Description').fill('Request a reset link');
    await page
      .getByLabel('Step 1 Expected Result')
      .fill('A reset link is sent');
    await page.getByRole('button', { name: 'Add Test Step' }).click();
    await page.getByLabel('Step 2 Description').fill('Open the reset link');
    await page
      .getByLabel('Step 2 Expected Result')
      .fill('The password form opens');
    await page.getByRole('button', { name: 'Save Test Case' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Password recovery' }),
    ).toBeVisible();
    await expect(page.getByText('2 steps', { exact: true })).toBeVisible();
  });

  test('validates required test case fields and test steps', async ({ page }) => {
    await prepareScenario(page);
    await page.getByRole('button', { name: 'Create Test Case' }).click();
    await page.getByRole('button', { name: 'Remove step 1' }).click();
    await page.getByRole('button', { name: 'Save Test Case' }).click();

    await expect(page.getByText('Test Case Name is required.')).toBeVisible();
    await expect(
      page.getByText('At least one test step is required.'),
    ).toBeVisible();

    await page.getByLabel('Test Case Name').fill('Validation case');
    await page.getByRole('button', { name: 'Add Test Step' }).click();
    await page.getByRole('button', { name: 'Save Test Case' }).click();
    await expect(
      page.getByText('Step Description is required for every test step.'),
    ).toBeVisible();
    await expect(
      page.getByText('Expected Result is required for every test step.'),
    ).toBeVisible();
  });

  test('prevents duplicate test cases within a scenario', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page);
    await page.getByRole('button', { name: 'Create Test Case' }).click();
    await page.getByLabel('Test Case Name').fill('  VALID CREDENTIALS  ');
    await page.getByLabel('Step 1 Description').fill('Enter credentials');
    await page.getByLabel('Step 1 Expected Result').fill('Login succeeds');
    await page.getByRole('button', { name: 'Save Test Case' }).click();

    await expect(
      page.getByText(
        'A test case with this name already exists in this scenario.',
      ),
    ).toBeVisible();
  });

  test('edits a test case', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page);
    await page
      .getByRole('button', { name: 'Edit Valid credentials' })
      .click();
    await page.getByLabel('Test Case Name').fill('Successful login');
    await page.getByLabel('Test Description').fill('Updated login coverage.');
    await page.getByLabel('Precondition').fill('An active account exists.');
    await page.getByLabel('Step 1 Description').fill('Submit credentials');
    await page
      .getByLabel('Step 1 Expected Result')
      .fill('The dashboard appears');
    await page.getByRole('button', { name: 'Save Test Case' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Successful login' }),
    ).toBeVisible();
    await expect(page.getByText('Updated login coverage.')).toBeVisible();
    await expect(page.getByText('1 step', { exact: true })).toBeVisible();
  });

  test('cancels test case creation and editing without saving', async ({
    page,
  }) => {
    await prepareScenario(page);
    await page.getByRole('button', { name: 'Create Test Case' }).click();
    await page.getByLabel('Test Case Name').fill('Unsaved Test Case');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('No test cases yet')).toBeVisible();

    await createTestCase(page);
    await page
      .getByRole('button', { name: 'Edit Valid credentials' })
      .click();
    await page.getByLabel('Test Case Name').fill('Changed Test Case');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toBeVisible();
    await expect(page.getByText('Changed Test Case')).toHaveCount(0);
  });

  test('cancels and confirms test case deletion', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page);
    await page
      .getByRole('button', { name: 'Delete Valid credentials' })
      .click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Delete Valid credentials' })
      .click();
    await page.getByRole('button', { name: 'Delete Test Case' }).click();
    await expect(page.getByText('No test cases yet')).toBeVisible();
  });

  test('searches test cases by name, description, and precondition', async ({
    page,
  }) => {
    await prepareScenario(page);
    await createTestCase(
      page,
      'Valid credentials',
      'Enter credentials',
      'Login succeeds',
      'Authentication happy path.',
      'A registered user exists.',
    );
    await createTestCase(
      page,
      'Locked account',
      'Enter locked credentials',
      'Login is rejected',
      'Account security coverage.',
      'A locked account exists.',
    );
    await page.getByLabel('Search test cases').fill('  SECURITY  ');

    await expect(
      page.getByRole('rowheader', { name: 'Locked account' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toHaveCount(0);

    await page.getByLabel('Search test cases').fill('registered');
    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Locked account' }),
    ).toHaveCount(0);
  });

  test('filters test cases by project and scenario context', async ({ page }) => {
    await prepareProject(page, 'Customer Portal');
    await createScenario(page, 'Login');
    await openScenario(page, 'Login');
    await createTestCase(page, 'Valid credentials');

    await createProject(page, 'Mobile App');
    await selectProject(page, 'Mobile App');
    await createScenario(page, 'Device permissions');
    await openScenario(page, 'Device permissions');
    await createTestCase(page, 'Allow notifications');

    await page
      .getByLabel('Project')
      .selectOption({ label: 'Customer Portal' });
    await page
      .getByLabel('Test Scenario', { exact: true })
      .selectOption({ label: 'Login' });
    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Allow notifications' }),
    ).toHaveCount(0);
  });

  test('sorts test cases by name in both directions', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page, 'Zulu Case');
    await createTestCase(page, 'Alpha Case');
    const table = page.getByRole('table', { name: 'Scenario Test Cases' });

    await page.getByRole('button', { name: /Sort by Test Case Name/ }).click();
    await expect(table.getByRole('row').nth(1)).toContainText('Alpha Case');
    await page.getByRole('button', { name: /Sort by Test Case Name/ }).click();
    await expect(table.getByRole('row').nth(1)).toContainText('Zulu Case');
  });

  test('filters test cases by latest execution status', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page, 'Valid credentials');
    await createTestCase(page, 'Locked account');
    await page.evaluate(() => {
      const testCases = JSON.parse(
        localStorage.getItem('testnest.testCases') ?? '[]',
      ) as Array<{
        id: string;
        projectId: string;
        scenarioId: string;
        name: string;
      }>;
      const failedCase = testCases.find(
        (testCase) => testCase.name === 'Locked account',
      );

      if (!failedCase) {
        throw new Error('Expected seeded test case');
      }

      localStorage.setItem(
        'testnest.executions',
        JSON.stringify([
          {
            id: 'execution-1',
            executionMode: 'quick',
            projectId: failedCase.projectId,
            scenarioId: failedCase.scenarioId,
            testCaseId: failedCase.id,
            overallStatus: 'Failed',
            executionDate: '2026-08-08T10:00:00.000Z',
            notes: 'Seeded failure.',
            stepResults: [],
          },
        ]),
      );
    });
    await page.reload();
    await page.getByRole('button', { name: 'Test Cases' }).click();
    await page.getByLabel('Project').selectOption({ label: 'QA Platform' });
    await page
      .getByLabel('Test Scenario', { exact: true })
      .selectOption({ label: 'Login' });
    await page.getByLabel('Filter by Latest Status').selectOption('Failed');

    await expect(
      page.getByRole('rowheader', { name: 'Locked account' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toHaveCount(0);
  });

  test('persists scenarios and test cases after browser refresh', async ({
    page,
  }) => {
    await prepareScenario(page);
    await createTestCase(page, 'Persistent test case');
    await page.reload();
    await page.getByRole('button', { name: 'Test Cases' }).click();
    await page.getByLabel('Project').selectOption({ label: 'QA Platform' });

    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();
    await openScenario(page);
    await expect(
      page.getByRole('rowheader', { name: 'Persistent test case' }),
    ).toBeVisible();
  });
});
