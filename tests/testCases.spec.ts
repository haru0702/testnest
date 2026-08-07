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
) {
  await page.getByRole('button', { name: 'Create Test Case' }).click();
  await page.getByLabel('Test Case Name').fill(name);
  await page.getByLabel('Test Description').fill('Successful login coverage.');
  await page.getByLabel('Precondition').fill('A registered user exists.');
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

  test('searches scenarios by name', async ({ page }) => {
    await prepareProject(page);
    await createScenario(page, 'Login');
    await createScenario(page, 'Checkout');
    await page.getByLabel('Search scenarios').fill('log');

    await expect(page.getByRole('rowheader', { name: 'Login' })).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Checkout' }),
    ).toHaveCount(0);
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
    await expect(page.getByText('Request a reset link')).toBeVisible();
    await expect(page.getByText('Open the reset link')).toBeVisible();
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
    await expect(page.getByText('Submit credentials')).toBeVisible();
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

  test('searches test cases by name', async ({ page }) => {
    await prepareScenario(page);
    await createTestCase(page, 'Valid credentials');
    await createTestCase(page, 'Locked account');
    await page.getByLabel('Search test cases').fill('valid');

    await expect(
      page.getByRole('rowheader', { name: 'Valid credentials' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Locked account' }),
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
