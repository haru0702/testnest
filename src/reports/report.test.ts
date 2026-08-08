import type { Defect } from '../defects/defect';
import type { TestExecution } from '../executions/execution';
import type { Project } from '../projects/project';
import type { TestCase, TestScenario } from '../testCases/testCase';
import {
  buildReportExportRows,
  EMPTY_REPORT_FILTERS,
  filterReportData,
  getAttentionRows,
  getAttentionSummary,
  getDateRangeError,
  getDefectSummary,
  getDefectsByPriority,
  getDefectsByProject,
  getDefectsBySeverity,
  getDefectsByStatus,
  getExecutionByProject,
  getExecutionByScenario,
  getExecutionSummary,
  getTraceabilityRows,
  INVALID_DATE_RANGE_ERROR,
  percentage,
  type ReportData,
} from './report';

const projects: Project[] = [
  {
    id: 'project-web',
    name: 'Web App',
    description: '',
    status: 'Active',
    createdDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'project-mobile',
    name: 'Mobile App',
    description: '',
    status: 'Active',
    createdDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2026-01-01T00:00:00.000Z',
  },
];

const scenarios: TestScenario[] = [
  {
    id: 'scenario-login',
    name: 'Login',
    description: '',
    projectId: 'project-web',
    createdDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'scenario-checkout',
    name: 'Checkout',
    description: '',
    projectId: 'project-mobile',
    createdDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2026-01-01T00:00:00.000Z',
  },
];

function makeTestCase(
  id: string,
  name: string,
  projectId = 'project-web',
  scenarioId = 'scenario-login',
): TestCase {
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
  makeTestCase('tc-1', 'Successful Login'),
  makeTestCase('tc-2', 'Invalid Login'),
  makeTestCase('tc-3', 'Locked Account'),
  makeTestCase(
    'tc-4',
    'Mobile Checkout',
    'project-mobile',
    'scenario-checkout',
  ),
];

function makeExecution(
  id: string,
  testCaseId: string,
  status: TestExecution['overallStatus'],
  executionDate: string,
  projectId = 'project-web',
  scenarioId = 'scenario-login',
): TestExecution {
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
  makeExecution('ex-old', 'tc-1', 'Failed', '2026-01-05T10:00:00.000Z'),
  makeExecution('ex-latest', 'tc-1', 'Passed', '2026-01-10T10:00:00.000Z'),
  makeExecution('ex-failed', 'tc-2', 'Failed', '2026-01-12T10:00:00.000Z'),
  makeExecution('ex-blocked', 'tc-3', 'Blocked', '2026-01-15T10:00:00.000Z'),
];

function makeDefect(
  id: string,
  defectId: string,
  overrides: Partial<Defect> = {},
): Defect {
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
    createdDate: '2026-01-12T00:00:00.000Z',
    updatedDate: '2026-01-12T00:00:00.000Z',
    ...overrides,
  };
}

const defects = [
  makeDefect('defect-1', 'DEF-0001', {
    projectId: 'project-web',
    scenarioId: 'scenario-login',
    testCaseId: 'tc-2',
    executionId: 'ex-failed',
    status: 'Open',
    severity: 'Critical',
    priority: 'High',
    externalSystem: 'Jira',
    externalIssueKey: 'QA-1',
    externalIssueUrl: 'https://example.com/QA-1',
  }),
  makeDefect('defect-2', 'DEF-0002', {
    projectId: 'project-web',
    scenarioId: 'scenario-login',
    testCaseId: 'tc-3',
    executionId: 'ex-blocked',
    status: 'Ready for Retest',
    severity: 'High',
    priority: 'Critical',
  }),
  makeDefect('defect-3', 'DEF-0003', {
    projectId: 'project-web',
    scenarioId: 'scenario-login',
    testCaseId: 'tc-1',
    status: 'Closed',
    severity: 'Medium',
    priority: 'Low',
  }),
  makeDefect('defect-4', 'DEF-0004', {
    projectId: 'project-mobile',
    scenarioId: 'scenario-checkout',
    testCaseId: 'tc-4',
    status: 'Reopened',
    severity: 'Low',
    priority: 'Medium',
    createdDate: '2026-02-01T00:00:00.000Z',
  }),
];

const reportData: ReportData = {
  projects,
  scenarios,
  testCases,
  executions,
  defects,
};

describe('report calculations', () => {
  it('uses only the latest execution status for each Test Case', () => {
    const summary = getExecutionSummary(testCases, executions);

    expect(summary.counts).toEqual({
      Passed: 1,
      Failed: 1,
      Blocked: 1,
      'No Run': 1,
    });
  });

  it('calculates execution percentages from Total Test Cases', () => {
    const summary = getExecutionSummary(testCases, executions);

    expect(summary.percentages).toEqual({
      Passed: 25,
      Failed: 25,
      Blocked: 25,
      'No Run': 25,
    });
    expect(percentage(7, 10)).toBe(70);
  });

  it('handles zero Test Cases safely', () => {
    expect(getExecutionSummary([], [])).toEqual({
      totalTestCases: 0,
      counts: { Passed: 0, Failed: 0, Blocked: 0, 'No Run': 0 },
      percentages: { Passed: 0, Failed: 0, Blocked: 0, 'No Run': 0 },
      executedTestCases: 0,
      completionPercentage: 0,
    });
  });

  it('calculates execution completion using non-No Run latest statuses', () => {
    const summary = getExecutionSummary(testCases, executions);

    expect(summary.executedTestCases).toBe(3);
    expect(summary.completionPercentage).toBe(75);
  });

  it('calculates defect status, severity, and priority summaries', () => {
    const summary = getDefectSummary(defects);

    expect(summary.total).toBe(4);
    expect(summary.statuses).toMatchObject({
      Open: 1,
      'Ready for Retest': 1,
      Closed: 1,
      Reopened: 1,
    });
    expect(summary.severities).toEqual({
      Critical: 1,
      High: 1,
      Medium: 1,
      Low: 1,
    });
    expect(summary.priorities).toEqual({
      Critical: 1,
      High: 1,
      Medium: 1,
      Low: 1,
    });
  });

  it('builds defects-by-status rows', () => {
    expect(getDefectsByStatus(defects)).toContainEqual({
      category: 'Open',
      count: 1,
      percentage: 25,
    });
  });

  it('builds defects-by-severity rows', () => {
    expect(getDefectsBySeverity(defects)).toEqual([
      { category: 'Critical', count: 1, percentage: 25 },
      { category: 'High', count: 1, percentage: 25 },
      { category: 'Medium', count: 1, percentage: 25 },
      { category: 'Low', count: 1, percentage: 25 },
    ]);
  });

  it('builds defects-by-priority rows', () => {
    expect(getDefectsByPriority(defects)).toContainEqual({
      category: 'Critical',
      count: 1,
      percentage: 25,
    });
  });

  it('builds execution breakdowns by Project and Scenario', () => {
    const filtered = filterReportData(reportData, EMPTY_REPORT_FILTERS);
    const projectRows = getExecutionByProject(filtered);
    const scenarioRows = getExecutionByScenario(filtered);

    expect(projectRows[0]).toMatchObject({
      project: 'Web App',
      totalTestCases: 3,
      Passed: 1,
      Failed: 1,
      Blocked: 1,
      'No Run': 0,
      executionPercentage: 100,
    });
    expect(scenarioRows.map((row) => row.scenario)).toEqual([
      'Login',
      'Checkout',
    ]);
  });

  it('builds defect breakdowns by Project', () => {
    expect(getDefectsByProject(projects, defects)).toContainEqual(
      expect.objectContaining({
        project: 'Web App',
        total: 3,
        Open: 1,
        Closed: 1,
        Critical: 1,
        High: 1,
      }),
    );
  });

  it('identifies Failed and Blocked tests without active defects', () => {
    const filtered = filterReportData(
      { ...reportData, defects: [] },
      EMPTY_REPORT_FILTERS,
    );
    const summary = getAttentionSummary(filtered);

    expect(summary.failedWithoutDefect).toBe(1);
    expect(summary.blockedWithoutDefect).toBe(1);
  });

  it('builds actionable attention records', () => {
    const filtered = filterReportData(reportData, EMPTY_REPORT_FILTERS);
    const rows = getAttentionRows(filtered);

    expect(rows.map((row) => row.category)).toEqual(
      expect.arrayContaining([
        'Critical defect not Closed',
        'High severity defect not Closed',
        'Ready for Retest',
        'No Run Test Case',
      ]),
    );
  });

  it('generates one traceability row per linked Defect and one for unlinked tests', () => {
    const additionalDefect = makeDefect('defect-5', 'DEF-0005', {
      projectId: 'project-web',
      scenarioId: 'scenario-login',
      testCaseId: 'tc-1',
    });
    const filtered = filterReportData(
      { ...reportData, defects: [...defects, additionalDefect] },
      EMPTY_REPORT_FILTERS,
    );
    const rows = getTraceabilityRows(filtered);

    expect(rows).toHaveLength(5);
    expect(rows.find((row) => row.testCase === 'Successful Login')).toMatchObject({
      project: 'Web App',
      scenario: 'Login',
      latestStatus: 'Passed',
    });
    expect(rows.find((row) => row.testCase === 'Mobile Checkout')).toMatchObject({
      latestStatus: 'No Run',
      defectId: 'DEF-0004',
    });
  });

  it('filters report data by Project and Scenario', () => {
    const filtered = filterReportData(reportData, {
      ...EMPTY_REPORT_FILTERS,
      projectId: 'project-web',
      scenarioId: 'scenario-login',
    });

    expect(filtered.projects.map((project) => project.name)).toEqual(['Web App']);
    expect(filtered.testCases).toHaveLength(3);
    expect(filtered.defects).toHaveLength(3);
  });

  it('filters executions and defect creation by inclusive date range', () => {
    const filtered = filterReportData(reportData, {
      ...EMPTY_REPORT_FILTERS,
      fromDate: '2026-01-10',
      toDate: '2026-01-15',
    });

    expect(filtered.executions.map((execution) => execution.id)).toEqual([
      'ex-latest',
      'ex-failed',
      'ex-blocked',
    ]);
    expect(filtered.defects.map((defect) => defect.defectId)).toEqual([
      'DEF-0001',
      'DEF-0002',
      'DEF-0003',
    ]);
  });

  it('validates an invalid date range', () => {
    expect(
      getDateRangeError({
        fromDate: '2026-02-01',
        toDate: '2026-01-01',
      }),
    ).toBe(INVALID_DATE_RANGE_ERROR);
    expect(
      getDateRangeError({
        fromDate: '2026-01-01',
        toDate: '2026-02-01',
      }),
    ).toBeNull();
  });

  it('generates filtered export rows for summary, Project, traceability, and attention reports', () => {
    const filtered = filterReportData(reportData, {
      ...EMPTY_REPORT_FILTERS,
      projectId: 'project-web',
    });

    expect(buildReportExportRows('executionSummary', filtered)).toHaveLength(4);
    expect(buildReportExportRows('executionByProject', filtered)).toEqual([
      expect.objectContaining({ Project: 'Web App', Passed: 1, Failed: 1 }),
    ]);
    expect(buildReportExportRows('defectSummary', filtered)).toHaveLength(5);
    expect(buildReportExportRows('defectsByProject', filtered)).toEqual([
      expect.objectContaining({ Project: 'Web App', Total: 3 }),
    ]);
    expect(buildReportExportRows('traceability', filtered)).toHaveLength(3);
    expect(buildReportExportRows('attention', filtered).length).toBeGreaterThan(0);
  });
});
