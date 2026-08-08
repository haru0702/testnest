import { expect, test, type Page } from '@playwright/test';

async function openProjects(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Projects' }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Projects' }),
  ).toBeVisible();
}

async function createProject(
  page: Page,
  name: string,
  description = 'Core regression coverage.',
  status: 'Active' | 'On Hold' | 'Completed' = 'Active',
) {
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.getByLabel('Project Name').fill(name);
  await page.getByLabel('Description').fill(description);
  await page.getByLabel('Status').selectOption(status);
  await page.getByRole('button', { name: 'Save Project' }).click();
}

async function seedProjects(page: Page, count: number) {
  const projects = Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString();

    return {
      id: `project-${number}`,
      name: `Project ${number}`,
      description: `Coverage for project ${number}.`,
      status: 'Active',
      createdDate: date,
      updatedDate: date,
    };
  });

  await page.evaluate((records) => {
    localStorage.setItem('testnest.projects', JSON.stringify(records));
  }, projects);
  await page.reload();
  await page.getByRole('button', { name: 'Projects' }).click();
}

test.describe('Project management', () => {
  test.beforeEach(async ({ page }) => {
    await openProjects(page);
  });

  test('displays the Projects page and its empty state', async ({ page }) => {
    await expect(page.getByText('No projects yet')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Project' }),
    ).toBeVisible();
  });

  test('creates a project and trims its name', async ({ page }) => {
    await createProject(
      page,
      '  Customer Portal  ',
      'Customer-facing regression suite.',
      'Active',
    );

    await expect(
      page.getByRole('rowheader', { name: 'Customer Portal' }),
    ).toBeVisible();
    await expect(page.getByText('Customer-facing regression suite.')).toBeVisible();
  });

  test('shows required project name validation', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click();
    await page.getByLabel('Project Name').fill('   ');
    await page.getByRole('button', { name: 'Save Project' }).click();

    await expect(page.getByText('Project Name is required.')).toBeVisible();
    await expect(page.getByLabel('Project Name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('cancels project creation without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click();
    await page.getByLabel('Project Name').fill('Unsaved Project');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByText('No projects yet')).toBeVisible();
    await expect(page.getByText('Unsaved Project')).toHaveCount(0);
  });

  test('prevents duplicate project names without considering case', async ({
    page,
  }) => {
    await createProject(page, 'Customer Portal');
    await page.getByRole('button', { name: 'Create Project' }).click();
    await page.getByLabel('Project Name').fill('  customer portal  ');
    await page.getByRole('button', { name: 'Save Project' }).click();

    await expect(
      page.getByText('A project with this name already exists.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByRole('rowheader', { name: 'Customer Portal' }),
    ).toHaveCount(1);
  });

  test('edits an existing project', async ({ page }) => {
    await createProject(page, 'Mobile App');
    await page.getByRole('button', { name: 'Edit Mobile App' }).click();
    await page.getByLabel('Project Name').fill('Mobile App Regression');
    await page.getByLabel('Description').fill('Updated mobile coverage.');
    await page.getByLabel('Status').selectOption('On Hold');
    await page.getByRole('button', { name: 'Save Project' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Mobile App Regression' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Mobile App', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText('Updated mobile coverage.')).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'On Hold' }),
    ).toBeVisible();
  });

  test('cancels an edit without saving changes', async ({ page }) => {
    await createProject(page, 'Payments');
    await page.getByRole('button', { name: 'Edit Payments' }).click();
    await page.getByLabel('Project Name').fill('Changed Payments');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Payments' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Changed Payments' }),
    ).toHaveCount(0);
  });

  test('deletes a project after confirmation', async ({ page }) => {
    await createProject(page, 'Legacy API');
    await page.getByRole('button', { name: 'Delete Legacy API' }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Delete Project' }).click();

    await expect(page.getByText('No projects yet')).toBeVisible();
  });

  test('cancels project deletion', async ({ page }) => {
    await createProject(page, 'Reporting');
    await page.getByRole('button', { name: 'Delete Reporting' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(
      page.getByRole('rowheader', { name: 'Reporting' }),
    ).toBeVisible();
  });

  test('keeps saved projects after a page refresh', async ({ page }) => {
    await createProject(page, 'Persistent Project');
    await page.reload();
    await page.getByRole('button', { name: 'Projects' }).click();

    await expect(
      page.getByRole('rowheader', { name: 'Persistent Project' }),
    ).toBeVisible();
  });

  test('searches projects by name', async ({ page }) => {
    await createProject(page, 'Customer Portal');
    await createProject(page, 'Mobile App');
    await page.getByLabel('Search projects').fill('  CUSTOMER  ');

    await expect(
      page.getByRole('rowheader', { name: 'Customer Portal' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Mobile App' }),
    ).toHaveCount(0);
  });

  test('filters projects by status', async ({ page }) => {
    await createProject(page, 'Customer Portal', 'Web coverage.', 'Active');
    await createProject(page, 'Mobile App', 'Mobile coverage.', 'Completed');
    await page
      .getByLabel('Filter by Status', { exact: true })
      .selectOption('Completed');

    await expect(
      page.getByRole('rowheader', { name: 'Mobile App' }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Customer Portal' }),
    ).toHaveCount(0);
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
  });

  test('sorts projects by name in both directions', async ({ page }) => {
    await createProject(page, 'Zulu Project');
    await createProject(page, 'Alpha Project');
    const table = page.getByRole('table', { name: 'Projects' });
    const nameHeader = page.getByRole('columnheader', {
      name: /Project Name/,
    });

    await page.getByRole('button', { name: /Sort by Project Name/ }).click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(table.getByRole('row').nth(1)).toContainText('Alpha Project');

    await page.getByRole('button', { name: /Sort by Project Name/ }).click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(table.getByRole('row').nth(1)).toContainText('Zulu Project');
  });

  test('combines project filters and clears them', async ({ page }) => {
    await createProject(page, 'Customer Portal', 'Web coverage.', 'Active');
    await createProject(
      page,
      'Customer API',
      'Service coverage.',
      'Completed',
    );
    await createProject(page, 'Mobile App', 'Mobile coverage.', 'Completed');
    await page.getByLabel('Search projects').fill('customer');
    await page
      .getByLabel('Filter by Status', { exact: true })
      .selectOption('Completed');

    await expect(
      page.getByRole('rowheader', { name: 'Customer API' }),
    ).toBeVisible();
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page.getByLabel('Search projects')).toHaveValue('');
    await expect(
      page.getByLabel('Filter by Status', { exact: true }),
    ).toHaveValue('all');
    await expect(page.getByText('3 results', { exact: true })).toBeVisible();
  });

  test('paginates projects and resets to page 1 after searching', async ({
    page,
  }) => {
    await seedProjects(page, 11);

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Project 11' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: 'Project 01' }),
    ).toBeVisible();

    await page.getByLabel('Search projects').fill('Project 11');
    await expect(page.getByText('1 result', { exact: true })).toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toHaveCount(0);
    await expect(
      page.getByRole('rowheader', { name: 'Project 11' }),
    ).toBeVisible();
  });
});
