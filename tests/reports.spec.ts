import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { read, utils } from '@e965/xlsx';

const webProject = {
  id: 'project-web',
  name: 'Web App',
  description: '',
  status: 'Active',
  createdDate: '2026-01-01T00:00:00.000Z',
  updatedDate: '2026-01-01T00:00:00.000Z',
};

const mobileProject = {
  ...webProject,
  id: 'project-mobile',
  name: 'Mobile App',
};

const loginScenario = {
  id: 'scenario-login',
  name: 'Login',
  description: '',
  projectId: webProject.id,
  createdDate: '2026-01-01T00:00:00.000Z',
  updatedDate: '2026-01-01T00:00:00.000Z',
};

const checkoutScenario = {
  ...loginScenario,
  id: 'scenario-checkout',
  name: 'Checkout',
  projectId: mobileProject.id,
};

function makeTestCase(
  id: string,
  name: string,
  projectId = webProject.id,
  scenarioId = loginScenario.id,
) {
  return {
    id,
    name,
    description: '',
    precondition: '',
    steps: [{ id: `${id}-step`, description: 'Run step', expectedResult: 'Done' }],
    projectId,
    scenarioId,
    createdDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2026-01-01T00:00:00.000Z',
  };
}

const testCases = [
  makeTestCase('tc-passed', 'Successful Login'),
  makeTestCase('tc-failed', 'Invalid Login'),
  makeTestCase('tc-failed-unlinked', 'Password Reset Failure'),
  makeTestCase('tc-no-run', 'Remember Me'),
  makeTestCase('tc-blocked', 'Mobile Checkout', mobileProject.id, checkoutScenario.id),
  makeTestCase('tc-blocked-unlinked', 'Mobile Payment', mobileProject.id, checkoutScenario.id),
];

function execution(
  id: string,
  testCaseId: string,
  status: string,
  executionDate: string,
  projectId = webProject.id,
  scenarioId = loginScenario.id,
) {
  return {
    id,
    executionMode: 'quick',
    projectId,
    scenarioId,
    testCaseId,
    overallStatus: status,
    executionDate,
    notes: '',
    stepResults: [],
  };
}

const executions = [
  execution('execution-old-failure', 'tc-passed', 'Failed', '2026-01-05T10:00:00.000Z'),
  execution('execution-latest-pass', 'tc-passed', 'Passed', '2026-01-20T10:00:00.000Z'),
  execution('execution-failed', 'tc-failed', 'Failed', '2026-01-21T10:00:00.000Z'),
  execution('execution-failed-unlinked', 'tc-failed-unlinked', 'Failed', '2026-01-22T10:00:00.000Z'),
  execution('execution-blocked', 'tc-blocked', 'Blocked', '2026-01-23T10:00:00.000Z', mobileProject.id, checkoutScenario.id),
  execution('execution-blocked-unlinked', 'tc-blocked-unlinked', 'Blocked', '2026-01-24T10:00:00.000Z', mobileProject.id, checkoutScenario.id),
];

function defect(id: string, defectId: string, overrides: Record<string, unknown>) {
  return {
    id,
    defectId,
    title: `Defect ${defectId}`,
    description: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    status: 'Open',
    severity: 'Medium',
    priority: 'Medium',
    assigneeName: '',
    reporterName: '',
    createdDate: '2026-01-20T00:00:00.000Z',
    updatedDate: '2026-01-20T00:00:00.000Z',
    ...overrides,
  };
}

const defects = [
  defect('defect-open', 'DEF-0001', {
    projectId: webProject.id,
    scenarioId: loginScenario.id,
    testCaseId: 'tc-failed',
    executionId: 'execution-failed',
    status: 'Open',
    severity: 'Critical',
    priority: 'High',
    externalSystem: 'Jira',
    externalIssueKey: 'QA-101',
    externalIssueUrl: 'https://example.com/QA-101',
  }),
  defect('defect-ready', 'DEF-0002', {
    projectId: mobileProject.id,
    scenarioId: checkoutScenario.id,
    testCaseId: 'tc-blocked',
    executionId: 'execution-blocked',
    status: 'Ready for Retest',
    severity: 'High',
    priority: 'Critical',
  }),
  defect('defect-closed', 'DEF-0003', {
    projectId: webProject.id,
    scenarioId: loginScenario.id,
    testCaseId: 'tc-passed',
    status: 'Closed',
    severity: 'Medium',
    priority: 'Low',
    createdDate: '2026-01-05T00:00:00.000Z',
  }),
  defect('defect-progress', 'DEF-0004', {
    projectId: webProject.id,
    scenarioId: loginScenario.id,
    status: 'In Progress',
    severity: 'Low',
    priority: 'Medium',
  }),
];

async function seedData(
  page: Page,
  data: {
    projects?: unknown[];
    scenarios?: unknown[];
    testCases?: unknown[];
    executions?: unknown[];
    defects?: unknown[];
  } = {},
) {
  await page.goto('/');
  await page.evaluate((records) => {
    localStorage.setItem('testnest.projects', JSON.stringify(records.projects ?? []));
    localStorage.setItem('testnest.scenarios', JSON.stringify(records.scenarios ?? []));
    localStorage.setItem('testnest.testCases', JSON.stringify(records.testCases ?? []));
    localStorage.setItem('testnest.executions', JSON.stringify(records.executions ?? []));
    localStorage.setItem('testnest.defects', JSON.stringify(records.defects ?? []));
  }, data);
  await page.reload();
}

async function seedReportingData(page: Page) {
  await seedData(page, {
    projects: [webProject, mobileProject],
    scenarios: [loginScenario, checkoutScenario],
    testCases,
    executions,
    defects,
  });
}

async function openReports(page: Page) {
  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Reports' })).toBeVisible();
}

async function applyFilters(page: Page) {
  await page.getByRole('button', { name: 'Apply Filters' }).click();
}

async function downloadedRows(path: string) {
  const workbook = read(await readFile(path), { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  });
}

test.describe('Enhanced Dashboard and Reports', () => {
  test('Dashboard KPIs, latest statuses, defects, attention, and refresh are correct', async ({ page }) => {
    await seedReportingData(page);

    await expect(page.getByLabel('Total Projects: 2')).toBeVisible();
    await expect(page.getByLabel('Total Test Cases: 6')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Passed: 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Failed: 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Blocked: 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Run: 1' })).toBeVisible();
    await expect(page.getByLabel('Total Defects: 4').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Defects: 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Critical Defects: 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ready for Retest: 1' })).toBeVisible();
    await expect(page.getByLabel('Failed Test Cases without an active linked Defect: 1')).toBeVisible();
    await expect(page.getByLabel('Blocked Test Cases without an active linked Defect: 1')).toBeVisible();
    await expect(page.getByLabel('Critical Open Defects: 1')).toBeVisible();
    await expect(page.getByLabel('Defects Ready for Retest: 1')).toBeVisible();
    await expect(page.getByLabel('No Run Test Cases: 1')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Passed: 1, 16.7%' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Failed: 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Defects: 1' })).toBeVisible();
  });

  test('Failed KPI opens Test Cases with the Failed filter applied', async ({ page }) => {
    await seedReportingData(page);
    await page.getByRole('button', { name: 'Failed: 2' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Test Cases' })).toBeVisible();
    await expect(page.getByLabel('Filter by Latest Status')).toHaveValue('Failed');
    await expect(page.getByRole('rowheader', { name: 'Invalid Login' })).toBeVisible();
  });

  test('No Run KPI opens Test Cases with the No Run filter applied', async ({ page }) => {
    await seedReportingData(page);
    await page.getByRole('button', { name: 'No Run: 1' }).click();

    await expect(page.getByLabel('Filter by Latest Status')).toHaveValue('No Run');
    await expect(page.getByRole('rowheader', { name: 'Remember Me' })).toBeVisible();
  });

  test('Open Defects KPI opens Defects with the Open filter applied', async ({ page }) => {
    await seedReportingData(page);
    await page.getByRole('button', { name: 'Open Defects: 1' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Defects' })).toBeVisible();
    await expect(page.getByLabel('Filter by Status')).toHaveValue('Open');
    await expect(page.getByRole('rowheader', { name: 'Defect DEF-0001' })).toBeVisible();
  });

  test('Critical Defects KPI applies the Critical severity filter', async ({ page }) => {
    await seedReportingData(page);
    await page.getByRole('button', { name: 'Critical Defects: 1' }).click();

    await expect(page.getByLabel('Filter by Severity')).toHaveValue('Critical');
    await expect(page.getByRole('rowheader', { name: 'Defect DEF-0001' })).toBeVisible();
  });

  test('Ready for Retest KPI applies the workflow status filter', async ({ page }) => {
    await seedReportingData(page);
    await page.getByRole('button', { name: 'Ready for Retest: 1' }).click();

    await expect(page.getByLabel('Filter by Status')).toHaveValue('Ready for Retest');
    await expect(page.getByRole('rowheader', { name: 'Defect DEF-0002' })).toBeVisible();
  });

  test('opens Reports and calculates the Test Execution Summary', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);

    await expect(page.getByRole('tab', { name: 'Test Execution Summary' })).toHaveAttribute('aria-selected', 'true');
    const report = page.getByRole('region', { name: 'Test Execution Summary report' });
    await expect(report.getByRole('article', { name: 'Total Test Cases: 6' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'Passed: 1' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'Failed: 2' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'Blocked: 2' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'No Run: 1' })).toBeVisible();
    await expect(report.getByLabel('Execution Completion: 83.3%')).toBeVisible();
  });

  test('filters Reports by Project, Scenario, and Execution Status together', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    const filters = page.getByRole('region', { name: 'Report Filters' });
    await filters.getByLabel('Project').selectOption(webProject.id);
    await filters.getByLabel('Test Scenario').selectOption(loginScenario.id);
    await filters.getByLabel('Execution Status').selectOption('Failed');
    await applyFilters(page);

    await expect(page.getByLabel('Active report filters: 3')).toBeVisible();
    await expect(page.getByText('Matching data: 2 Test Cases, 4 executions, and 1 defects.')).toBeVisible();
    await expect(page.getByRole('article', { name: 'Failed: 2' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(filters.getByLabel('Project')).toHaveValue('all');
    await expect(filters.getByLabel('Test Scenario')).toHaveValue('all');
    await expect(filters.getByLabel('Execution Status')).toHaveValue('all');
    await expect(page.getByLabel('Active report filters: 0')).toBeVisible();
  });

  test('combines Defect Status, Severity, and Priority filters', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByLabel('Defect Status').selectOption('Open');
    await page.getByLabel('Severity').selectOption('Critical');
    await page.getByLabel('Priority').selectOption('High');
    await applyFilters(page);
    await page.getByRole('tab', { name: 'Defect Summary' }).click();

    const report = page.getByRole('region', { name: 'Defect Summary report' });
    await expect(report.getByRole('article', { name: 'Total Defects: 1' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'Open: 1' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'Critical: 1' })).toBeVisible();
    await expect(report.getByRole('article', { name: 'High: 0' })).toBeVisible();
  });

  test('applies inclusive dates and rejects an invalid date range', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByLabel('From Date').fill('2026-01-20');
    await page.getByLabel('To Date').fill('2026-01-23');
    await applyFilters(page);
    await expect(page.getByText('Matching data: 6 Test Cases, 4 executions, and 3 defects.')).toBeVisible();

    await page.getByLabel('From Date').fill('2026-02-01');
    await page.getByLabel('To Date').fill('2026-01-01');
    await applyFilters(page);
    await expect(page.getByRole('alert')).toHaveText('From Date must be on or before To Date.');
    await expect(page.getByLabel('Active report filters: 2')).toBeVisible();
  });

  test('shows and sorts Test Execution by Project', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByRole('tab', { name: 'Test Execution by Project' }).click();

    const table = page.getByRole('table', { name: 'Test Execution by Project data' });
    await expect(table.getByRole('rowheader', { name: 'Mobile App' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Web App' })).toBeVisible();
    await page.getByRole('button', { name: 'Sort by Failed' }).click();
    await expect(table.getByRole('row').nth(1)).toContainText('Mobile App');
  });

  test('shows searchable Test Execution by Scenario', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByRole('tab', { name: 'Test Execution by Scenario' }).click();
    await page.getByLabel('Search Test Execution by Scenario').fill('Checkout');

    await expect(page.getByText('1 result')).toBeVisible();
    const table = page.getByRole('table', { name: 'Test Execution by Scenario data' });
    await expect(table.getByRole('rowheader', { name: 'Mobile App' })).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Checkout' })).toBeVisible();
  });

  test('paginates Scenario report rows and resets after search', async ({ page }) => {
    const manyScenarios = Array.from({ length: 12 }, (_, index) => ({
      ...loginScenario,
      id: `scenario-${index + 1}`,
      name: `Scenario ${String(index + 1).padStart(2, '0')}`,
    }));
    const manyCases = manyScenarios.map((scenario, index) =>
      makeTestCase(`case-${index + 1}`, `Case ${index + 1}`, webProject.id, scenario.id),
    );
    await seedData(page, {
      projects: [webProject],
      scenarios: manyScenarios,
      testCases: manyCases,
    });
    await openReports(page);
    await page.getByRole('tab', { name: 'Test Execution by Scenario' }).click();

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await page.getByLabel('Search Test Execution by Scenario').fill('Scenario 03');
    await expect(page.getByText('1 result')).toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toHaveCount(0);
  });

  test('shows Defects by Project breakdown', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByRole('tab', { name: 'Defects by Project' }).click();

    const table = page.getByRole('table', { name: 'Defects by Project data' });
    const webRow = table.getByRole('row').filter({ hasText: 'Web App' });
    await expect(webRow).toContainText('3');
    await expect(webRow).toContainText('1');
  });

  test('shows Defects by Severity, Priority, and Status reports', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);

    for (const tab of ['Defects by Severity', 'Defects by Priority', 'Defects by Status']) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('table', { name: `${tab} data` })).toBeVisible();
      await expect(page.getByRole('img', { name: /Critical: 1, 25%|Open: 1, 25%/ })).toBeVisible();
    }
  });

  test('shows traceability and filters Has Defect and Has External Issue', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByRole('tab', { name: 'Traceability Report' }).click();

    const table = page.getByRole('table', { name: 'Traceability Report data' });
    await expect(table.getByText('QA-101', { exact: true })).toBeVisible();
    await expect(table.getByText('EX-EXECUTIO', { exact: true }).first()).toBeVisible();
    await page.getByLabel('Has Defect').selectOption('no');
    await expect(page.getByText('3 results')).toBeVisible();
    await expect(table.getByText('No Defect', { exact: true })).toHaveCount(3);
    await page.getByLabel('Has Defect').selectOption('yes');
    await page.getByLabel('Has External Issue').selectOption('yes');
    await expect(page.getByText('1 result')).toBeVisible();
    await expect(table.getByText('QA-101', { exact: true })).toBeVisible();
  });

  test('shows the actionable Attention Needed report', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByRole('tab', { name: 'Attention Needed Report' }).click();

    const table = page.getByRole('table', { name: 'Attention Needed Report data' });
    await expect(table.getByRole('rowheader', { name: 'Failed without active defect' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Blocked without active defect' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Critical defect not Closed' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Ready for Retest' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'No Run Test Case' })).toBeVisible();
  });

  test('exports and inspects the filtered Test Execution Summary workbook', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByLabel('Project').selectOption(webProject.id);
    await applyFilters(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Report' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(download.suggestedFilename()).toBe('testnest-test-execution-summary.xlsx');
    expect(path).not.toBeNull();
    const rows = await downloadedRows(path!);

    expect(rows[0]).toEqual(['Status', 'Count', 'Percentage']);
    expect(rows).toContainEqual(['Passed', '1', '25']);
    expect(rows).toContainEqual(['Failed', '2', '50']);
  });

  test('exports only the filtered Traceability dataset', async ({ page }) => {
    await seedReportingData(page);
    await openReports(page);
    await page.getByRole('tab', { name: 'Traceability Report' }).click();
    await page.getByLabel('Has Defect').selectOption('yes');
    await page.getByLabel('Has External Issue').selectOption('yes');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Report' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const rows = await downloadedRows(path!);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('External Issue Key');
    expect(rows[1]).toContain('QA-101');
    expect(rows[1]).toContain('DEF-0001');
  });

  test('empty-data Dashboard and Reports remain stable', async ({ page }) => {
    await seedData(page);
    await expect(page.getByLabel('Total Projects: 0')).toBeVisible();
    await expect(page.getByText('No Test Cases are available yet.')).toBeVisible();
    await expect(page.getByText('No Defects are currently recorded.')).toBeVisible();
    await openReports(page);
    await expect(page.getByLabel('Execution Completion: 0%')).toBeVisible();
    await page.getByRole('tab', { name: 'Traceability Report' }).click();
    await expect(page.getByText('No report rows match your filters.')).toBeVisible();
  });
});
