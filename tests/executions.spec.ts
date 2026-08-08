import { expect, test, type Page } from '@playwright/test';

const projectName = 'QA Platform';
const scenarioName = 'Login';
const testCaseName = 'Valid credentials';

async function createExecutableTestCase(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.getByLabel('Project Name').fill(projectName);
  await page.getByLabel('Description').fill('Execution project.');
  await page.getByRole('button', { name: 'Save Project' }).click();

  await page.getByRole('button', { name: 'Test Cases' }).click();
  await page.getByLabel('Project').selectOption({ label: projectName });
  await page.getByRole('button', { name: 'Create Scenario' }).click();
  await page.getByLabel('Scenario Name').fill(scenarioName);
  await page.getByLabel('Description').fill('Authentication scenario.');
  await page.getByRole('button', { name: 'Save Scenario' }).click();
  await page.getByRole('button', { name: `Open ${scenarioName}` }).click();

  await page.getByRole('button', { name: 'Create Test Case' }).click();
  await page.getByLabel('Test Case Name').fill(testCaseName);
  await page
    .getByLabel('Test Description')
    .fill('Verify a user can sign in successfully.');
  await page.getByLabel('Precondition').fill('A registered user exists.');
  await page.getByLabel('Step 1 Description').fill('Enter valid credentials');
  await page
    .getByLabel('Step 1 Expected Result')
    .fill('Credentials are accepted');
  await page.getByRole('button', { name: 'Add Test Step' }).click();
  await page.getByLabel('Step 2 Description').fill('Submit the login form');
  await page
    .getByLabel('Step 2 Expected Result')
    .fill('The dashboard appears');
  await page.getByRole('button', { name: 'Save Test Case' }).click();
}

async function selectExecutableTestCase(page: Page) {
  await page.getByRole('button', { name: 'Test Execution' }).click();
  await page.getByLabel('Project').selectOption({ label: projectName });
  await page
    .getByLabel('Test Scenario')
    .selectOption({ label: scenarioName });
  await page.getByLabel('Test Case').selectOption({ label: testCaseName });
}

async function prepareExecution(page: Page) {
  await createExecutableTestCase(page);
  await selectExecutableTestCase(page);
}

async function startExecution(page: Page) {
  await page.getByRole('button', { name: 'Start Detailed Run' }).click();
}

async function startQuickRun(page: Page) {
  await page.getByRole('button', { name: 'Start Quick Run' }).click();
}

async function setStepStatus(
  page: Page,
  stepNumber: number,
  status: 'Passed' | 'Failed' | 'Blocked' | 'No Run',
) {
  await page.getByLabel(`Step ${stepNumber} Status`).selectOption(status);
}

async function savePassedExecution(page: Page, notes = 'Run completed.') {
  await startExecution(page);
  await page.getByLabel('Step 1 Actual Result').fill('Credentials accepted.');
  await page.getByLabel('Step 2 Actual Result').fill('Dashboard displayed.');
  await setStepStatus(page, 1, 'Passed');
  await setStepStatus(page, 2, 'Passed');
  await page.getByLabel('Notes / Comments').fill(notes);
  await page.getByRole('button', { name: 'Save Execution' }).click();
}

async function saveQuickRun(
  page: Page,
  status: 'Passed' | 'Failed' | 'Blocked' | 'No Run',
  notes: string,
) {
  await startQuickRun(page);
  await page.getByLabel('Overall Status', { exact: true }).selectOption(status);
  await page.getByLabel('Notes / Comments').fill(notes);
  await page.getByRole('button', { name: 'Save Quick Run' }).click();
}

test.describe('Test execution', () => {
  test('opens the Test Execution page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Test Execution' }).click();

    await expect(
      page.getByRole('heading', { level: 2, name: 'Test Execution' }),
    ).toBeVisible();
    await expect(page.getByLabel('Project')).toBeVisible();
    await expect(page.getByLabel('Test Scenario')).toBeDisabled();
    await expect(page.getByLabel('Test Case')).toBeDisabled();
  });

  test('selects a project, scenario, and test case', async ({ page }) => {
    await prepareExecution(page);

    await expect(page.getByLabel('Project')).toHaveValue(/.+/);
    await expect(page.getByLabel('Test Scenario')).toHaveValue(/.+/);
    await expect(page.getByLabel('Test Case')).toHaveValue(/.+/);
    await expect(
      page.getByRole('button', { name: 'Start Quick Run' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start Detailed Run' }),
    ).toBeVisible();
  });

  test('displays the selected test case details', async ({ page }) => {
    await prepareExecution(page);

    await expect(
      page.getByRole('heading', { level: 3, name: testCaseName }),
    ).toBeVisible();
    await expect(
      page.getByText('Verify a user can sign in successfully.'),
    ).toBeVisible();
    await expect(page.getByText('A registered user exists.')).toBeVisible();
    await expect(page.getByText('Enter valid credentials')).toBeVisible();
    await expect(page.getByText('Credentials are accepted')).toBeVisible();
  });

  test('records actual results for each step', async ({ page }) => {
    await prepareExecution(page);
    await startExecution(page);
    await page.getByLabel('Step 1 Actual Result').fill('Credentials accepted.');
    await page.getByLabel('Step 2 Actual Result').fill('Dashboard displayed.');

    await expect(page.getByLabel('Step 1 Actual Result')).toHaveValue(
      'Credentials accepted.',
    );
    await expect(page.getByLabel('Step 2 Actual Result')).toHaveValue(
      'Dashboard displayed.',
    );
  });

  test('changes individual step statuses', async ({ page }) => {
    await prepareExecution(page);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Failed');

    await expect(page.getByLabel('Step 1 Status')).toHaveValue('Passed');
    await expect(page.getByLabel('Step 2 Status')).toHaveValue('Failed');
  });

  test('automatically calculates Passed when every step passes', async ({
    page,
  }) => {
    await prepareExecution(page);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Passed');

    await expect(
      page.getByLabel('Overall Status', { exact: true }),
    ).toContainText('Passed');
  });

  test('automatically calculates Failed when any step fails', async ({
    page,
  }) => {
    await prepareExecution(page);
    await startExecution(page);
    await setStepStatus(page, 1, 'Blocked');
    await setStepStatus(page, 2, 'Failed');

    await expect(
      page.getByLabel('Overall Status', { exact: true }),
    ).toContainText('Failed');
  });

  test('automatically calculates Blocked when a step is blocked and none fail', async ({
    page,
  }) => {
    await prepareExecution(page);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Blocked');

    await expect(
      page.getByLabel('Overall Status', { exact: true }),
    ).toContainText('Blocked');
  });

  test('saves an execution in history', async ({ page }) => {
    await prepareExecution(page);
    await savePassedExecution(page, 'Smoke run passed.');

    const history = page.getByRole('table', { name: 'Execution History' });
    await expect(history).toBeVisible();
    await expect(
      history.getByText('Detailed Run', { exact: true }),
    ).toBeVisible();
    await expect(history.getByText('Passed', { exact: true })).toBeVisible();
    await expect(history.getByText('Smoke run passed.')).toBeVisible();
  });

  test('starts a Quick Run without showing step result fields', async ({
    page,
  }) => {
    await prepareExecution(page);
    await startQuickRun(page);

    await expect(
      page.getByLabel('Overall Status', { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Notes / Comments')).toBeVisible();
    await expect(page.getByLabel('Step 1 Actual Result')).toHaveCount(0);
  });

  for (const status of ['Passed', 'Failed', 'Blocked', 'No Run'] as const) {
    test(`saves a Quick Run with ${status} status`, async ({ page }) => {
      await prepareExecution(page);
      await saveQuickRun(page, status, `Quick ${status} result.`);

      const history = page.getByRole('table', { name: 'Execution History' });
      const row = history.getByRole('row').filter({
        hasText: `Quick ${status} result.`,
      });
      await expect(row).toContainText('Quick Run');
      await expect(row).toContainText(status);
    });
  }

  test('shows a Quick Run explanation instead of fabricated step results', async ({
    page,
  }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Passed', 'Fast verification.');
    await page
      .getByRole('button', { name: 'View execution details 1' })
      .click();

    const details = page.getByRole('region', { name: 'Execution Details' });
    await expect(details.getByText('Quick Run', { exact: true })).toBeVisible();
    await expect(
      details.getByText(
        'Step-level results were not recorded for this Quick Run.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(details.getByText('Step 1', { exact: true })).toHaveCount(0);
  });

  test('updates Dashboard counts from a Quick Run', async ({ page }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Blocked', 'Environment unavailable.');
    await page.getByRole('button', { name: 'Dashboard' }).click();

    await expect(
      page.getByRole('article', { name: 'Blocked: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'No Run: 0' }),
    ).toBeVisible();
  });

  test('starts a Detailed Run with step result fields', async ({ page }) => {
    await prepareExecution(page);
    await startExecution(page);

    await expect(page.getByLabel('Step 1 Actual Result')).toBeVisible();
    await expect(page.getByLabel('Step 2 Status')).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Bulk step actions' }),
    ).toBeVisible();
  });

  test('marks every step as Passed in one action', async ({ page }) => {
    await prepareExecution(page);
    await startExecution(page);
    await page.getByRole('button', { name: 'Mark All Passed' }).click();

    await expect(page.getByLabel('Step 1 Status')).toHaveValue('Passed');
    await expect(page.getByLabel('Step 2 Status')).toHaveValue('Passed');
    await expect(
      page.getByLabel('Overall Status', { exact: true }),
    ).toContainText('Passed');
  });

  test('applies the selected status to every step', async ({ page }) => {
    await prepareExecution(page);
    await startExecution(page);
    await page.getByLabel('Apply Status to All Steps').selectOption('Failed');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect(page.getByLabel('Step 1 Status')).toHaveValue('Failed');
    await expect(page.getByLabel('Step 2 Status')).toHaveValue('Failed');
    await expect(
      page.getByLabel('Overall Status', { exact: true }),
    ).toContainText('Failed');
  });

  test('bulk status changes preserve actual results', async ({ page }) => {
    await prepareExecution(page);
    await startExecution(page);
    await page.getByLabel('Step 1 Actual Result').fill('First observed result');
    await page.getByLabel('Step 2 Actual Result').fill('Second observed result');
    await page.getByLabel('Apply Status to All Steps').selectOption('Blocked');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect(page.getByLabel('Step 1 Actual Result')).toHaveValue(
      'First observed result',
    );
    await expect(page.getByLabel('Step 2 Actual Result')).toHaveValue(
      'Second observed result',
    );
  });

  test('opens read-only execution history details', async ({ page }) => {
    await prepareExecution(page);
    await savePassedExecution(page, 'Detailed result.');
    await page
      .getByRole('button', { name: 'View execution details 1' })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Execution Details' }),
    ).toBeVisible();
    const details = page.getByRole('region', { name: 'Execution Details' });
    await expect(details.getByText('Credentials accepted.')).toBeVisible();
    await expect(
      details.getByText('Credentials are accepted', { exact: true }),
    ).toBeVisible();
    await expect(details.getByText('Detailed result.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Close Details' }),
    ).toBeVisible();
  });

  test('persists execution history after browser refresh', async ({ page }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Passed', 'Persistent execution.');
    await page.reload();
    await selectExecutableTestCase(page);

    const history = page.getByRole('table', { name: 'Execution History' });
    await expect(history.getByText('Persistent execution.')).toBeVisible();
    await expect(history.getByText('Quick Run', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'View execution details 1' }),
    ).toBeVisible();
  });

  test('filters execution history by status and clears filters', async ({
    page,
  }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Passed', 'Quick passing run.');
    await page.waitForTimeout(10);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Failed');
    await page.getByLabel('Notes / Comments').fill('Detailed failing run.');
    await page.getByRole('button', { name: 'Save Execution' }).click();

    await page
      .getByLabel('Filter by Status', { exact: true })
      .selectOption('Passed');
    const history = page.getByRole('table', { name: 'Execution History' });
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(history.getByText('Quick passing run.')).toBeVisible();
    await expect(history.getByText('Detailed failing run.')).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page.getByText('2 results', { exact: true })).toBeVisible();
    await expect(
      page.getByLabel('Filter by Status', { exact: true }),
    ).toHaveValue('all');
  });

  test('filters execution history by execution mode', async ({ page }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Passed', 'Quick mode record.');
    await page.waitForTimeout(10);
    await savePassedExecution(page, 'Detailed mode record.');

    await page
      .getByLabel('Filter by Execution Mode')
      .selectOption('detailed');
    const history = page.getByRole('table', { name: 'Execution History' });
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(history.getByText('Detailed mode record.')).toBeVisible();
    await expect(history.getByText('Quick mode record.')).toHaveCount(0);
  });

  test('sorts execution history by execution date', async ({ page }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Passed', 'First execution.');
    await page.waitForTimeout(10);
    await saveQuickRun(page, 'Failed', 'Second execution.');

    const history = page.getByRole('table', { name: 'Execution History' });
    await expect(history.getByRole('row').nth(1)).toContainText(
      'Second execution.',
    );

    await page
      .getByRole('button', { name: /Sort by Execution Date/ })
      .click();
    await expect(history.getByRole('row').nth(1)).toContainText(
      'First execution.',
    );
  });

  test('sorts execution history by overall status', async ({ page }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Failed', 'Failed status record.');
    await page.waitForTimeout(10);
    await saveQuickRun(page, 'Passed', 'Passed status record.');
    const history = page.getByRole('table', { name: 'Execution History' });

    await page
      .getByRole('button', { name: /Sort by Overall Status/ })
      .click();
    await expect(history.getByRole('row').nth(1)).toContainText(
      'Failed status record.',
    );

    await page
      .getByRole('button', { name: /Sort by Overall Status/ })
      .click();
    await expect(history.getByRole('row').nth(1)).toContainText(
      'Passed status record.',
    );
  });

  test('updates Dashboard counts after execution', async ({ page }) => {
    await prepareExecution(page);
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(
      page.getByRole('article', { name: 'Total Projects: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Total Test Cases: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'No Run: 1' }),
    ).toBeVisible();

    await selectExecutableTestCase(page);
    await savePassedExecution(page);
    await page.getByRole('button', { name: 'Dashboard' }).click();

    await expect(
      page.getByRole('article', { name: 'Passed: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'No Run: 0' }),
    ).toBeVisible();
  });

  test('uses only the latest execution when a test case is re-executed', async ({
    page,
  }) => {
    await prepareExecution(page);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Failed');
    await page.getByRole('button', { name: 'Save Execution' }).click();
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(
      page.getByRole('article', { name: 'Failed: 1' }),
    ).toBeVisible();

    await selectExecutableTestCase(page);
    await savePassedExecution(page);
    await page.getByRole('button', { name: 'Dashboard' }).click();

    await expect(
      page.getByRole('article', { name: 'Passed: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Failed: 0' }),
    ).toBeVisible();
  });

  test('uses a newer Detailed Run after a Quick Run for Dashboard status', async ({
    page,
  }) => {
    await prepareExecution(page);
    await saveQuickRun(page, 'Passed', 'Quick result first.');
    await page.waitForTimeout(10);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Failed');
    await page.getByRole('button', { name: 'Save Execution' }).click();
    await page.getByRole('button', { name: 'Dashboard' }).click();

    await expect(
      page.getByRole('article', { name: 'Failed: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Passed: 0' }),
    ).toBeVisible();
  });

  test('uses a newer Quick Run after a Detailed Run for Dashboard status', async ({
    page,
  }) => {
    await prepareExecution(page);
    await startExecution(page);
    await setStepStatus(page, 1, 'Passed');
    await setStepStatus(page, 2, 'Failed');
    await page.getByRole('button', { name: 'Save Execution' }).click();
    await page.waitForTimeout(10);
    await saveQuickRun(page, 'Passed', 'Quick result last.');
    await page.getByRole('button', { name: 'Dashboard' }).click();

    await expect(
      page.getByRole('article', { name: 'Passed: 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Failed: 0' }),
    ).toBeVisible();
  });
});
