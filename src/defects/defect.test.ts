import type { TestExecution } from '../executions/execution';
import type { TestCase } from '../testCases/testCase';
import {
  buildDefectDraftFromExecution,
  compareDefects,
  createDefect,
  DEFECT_PRIORITIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  DEFECT_TITLE_REQUIRED_ERROR,
  EMPTY_DEFECT_FILTERS,
  EMPTY_DEFECT_FORM_VALUES,
  EXTERNAL_URL_ERROR,
  filterDefects,
  generateNextDefectId,
  getDefectTitleError,
  getExternalIssueUrlError,
  getFailedOrBlockedTestsWithoutActiveDefects,
  normalizeDefectValues,
  type Defect,
  type DefectFormValues,
} from './defect';
import { DEFECT_STORAGE_KEY, loadDefects, saveDefects } from './defectStorage';

const testCase: TestCase = {
  id: 'test-case-1',
  name: 'Verify Login',
  description: 'Verify a user can sign in.',
  precondition: 'User exists',
  projectId: 'project-1',
  scenarioId: 'scenario-1',
  steps: [
    {
      id: 'step-1',
      description: 'Click Login',
      expectedResult: 'Dashboard appears',
    },
  ],
  createdDate: '2026-01-01T00:00:00.000Z',
  updatedDate: '2026-01-01T00:00:00.000Z',
};

function makeExecution(
  id: string,
  status: TestExecution['overallStatus'],
  executionDate = '2026-01-02T00:00:00.000Z',
): TestExecution {
  return {
    id,
    executionMode: 'detailed',
    projectId: testCase.projectId,
    scenarioId: testCase.scenarioId,
    testCaseId: testCase.id,
    overallStatus: status,
    executionDate,
    notes: '',
    stepResults: [
      {
        testStepId: 'step-1',
        stepNumber: 1,
        stepDescription: 'Click Login',
        expectedResult: 'Dashboard appears',
        actualResult: 'Error message appears',
        status,
      },
    ],
  };
}

function makeDefect(
  overrides: Partial<Defect> = {},
  existing: Defect[] = [],
) {
  const defect = createDefect(
    {
      ...EMPTY_DEFECT_FORM_VALUES,
      title: 'Login does not work',
      status: overrides.status ?? 'Open',
      severity: overrides.severity ?? 'Medium',
      priority: overrides.priority ?? 'Medium',
      assigneeName: overrides.assigneeName ?? '',
      reporterName: overrides.reporterName ?? '',
      projectId: overrides.projectId ?? '',
      scenarioId: overrides.scenarioId ?? '',
      testCaseId: overrides.testCaseId ?? '',
      executionId: overrides.executionId ?? '',
      testStepId: overrides.testStepId ?? '',
      testStepNumber: overrides.testStepNumber,
      externalSystem: overrides.externalSystem ?? '',
      externalIssueKey: overrides.externalIssueKey ?? '',
      externalIssueUrl: overrides.externalIssueUrl ?? '',
    },
    existing,
    {
      id: overrides.id ?? 'defect-internal-1',
      now: overrides.createdDate ?? '2026-01-03T00:00:00.000Z',
    },
  );

  return { ...defect, ...overrides };
}

describe('defect validation and creation', () => {
  it('requires a non-whitespace title', () => {
    expect(getDefectTitleError('   ')).toBe(DEFECT_TITLE_REQUIRED_ERROR);
    expect(getDefectTitleError('Broken login')).toBeNull();
  });

  it('trims defect text values', () => {
    const normalized = normalizeDefectValues({
      ...EMPTY_DEFECT_FORM_VALUES,
      title: '  Broken login  ',
      description: '  Cannot sign in  ',
      assigneeName: '  Alex  ',
    });

    expect(normalized.title).toBe('Broken login');
    expect(normalized.description).toBe('Cannot sign in');
    expect(normalized.assigneeName).toBe('Alex');
  });

  it('generates the next readable defect ID', () => {
    expect(generateNextDefectId([])).toBe('DEF-0001');
    expect(
      generateNextDefectId([
        { defectId: 'DEF-0002' },
        { defectId: 'legacy-id' },
        { defectId: 'DEF-0010' },
      ]),
    ).toBe('DEF-0011');
  });

  it('exposes the supported status, severity, and priority values', () => {
    expect(DEFECT_STATUSES).toEqual([
      'Open',
      'In Progress',
      'Ready for Retest',
      'Closed',
      'Reopened',
    ]);
    expect(DEFECT_SEVERITIES).toEqual([
      'Critical',
      'High',
      'Medium',
      'Low',
    ]);
    expect(DEFECT_PRIORITIES).toEqual([
      'Critical',
      'High',
      'Medium',
      'Low',
    ]);
  });

  it('accepts only HTTP or HTTPS external URLs', () => {
    expect(getExternalIssueUrlError('')).toBeNull();
    expect(getExternalIssueUrlError('https://example.com/BUG-1')).toBeNull();
    expect(getExternalIssueUrlError('http://example.com/BUG-1')).toBeNull();
    expect(getExternalIssueUrlError('ftp://example.com/BUG-1')).toBe(
      EXTERNAL_URL_ERROR,
    );
    expect(getExternalIssueUrlError('not a url')).toBe(EXTERNAL_URL_ERROR);
  });

  it('creates a standalone manual defect with defaults and no traceability', () => {
    const defect = createDefect(
      { ...EMPTY_DEFECT_FORM_VALUES, title: '  Manual issue  ' },
      [],
      { id: 'internal-1', now: '2026-01-01T00:00:00.000Z' },
    );

    expect(defect).toMatchObject({
      id: 'internal-1',
      defectId: 'DEF-0001',
      title: 'Manual issue',
      status: 'Open',
      severity: 'Medium',
      priority: 'Medium',
      projectId: undefined,
      executionId: undefined,
    });
  });

  it('builds editable traceability from an execution and failed step', () => {
    const execution = makeExecution('execution-1', 'Failed');
    const draft = buildDefectDraftFromExecution(
      execution,
      testCase,
      execution.stepResults[0],
    );

    expect(draft).toMatchObject({
      title: 'Verify Login - Click Login failed',
      projectId: 'project-1',
      scenarioId: 'scenario-1',
      testCaseId: 'test-case-1',
      executionId: 'execution-1',
      testStepId: 'step-1',
      testStepNumber: 1,
      expectedResult: 'Dashboard appears',
      actualResult: 'Error message appears',
    });

    const defect = createDefect(draft, [], {
      id: 'defect-from-execution',
      now: '2026-01-03T00:00:00.000Z',
    });
    expect(defect).toMatchObject({
      id: 'defect-from-execution',
      defectId: 'DEF-0001',
      executionId: 'execution-1',
      testCaseId: 'test-case-1',
      testStepNumber: 1,
    });

    expect(buildDefectDraftFromExecution(execution, testCase)).toMatchObject({
      title: 'Verify Login - Click Login failed',
      testStepId: 'step-1',
      expectedResult: 'Dashboard appears',
      actualResult: 'Error message appears',
    });
  });
});

describe('defect queries', () => {
  it('finds latest failed or blocked tests without an active defect', () => {
    const failed = makeExecution('failed', 'Failed');
    const results = getFailedOrBlockedTestsWithoutActiveDefects(
      [testCase],
      [failed],
      [],
    );

    expect(results).toEqual([{ testCase, execution: failed }]);
  });

  it('ignores older failures and active defect links', () => {
    const olderFailure = makeExecution(
      'failed',
      'Failed',
      '2026-01-01T00:00:00.000Z',
    );
    const newerPass = makeExecution(
      'passed',
      'Passed',
      '2026-01-02T00:00:00.000Z',
    );
    expect(
      getFailedOrBlockedTestsWithoutActiveDefects(
        [testCase],
        [olderFailure, newerPass],
        [],
      ),
    ).toEqual([]);

    const activeDefect = makeDefect({
      testCaseId: testCase.id,
      executionId: olderFailure.id,
      status: 'Open',
    });
    expect(
      getFailedOrBlockedTestsWithoutActiveDefects(
        [testCase],
        [olderFailure],
        [activeDefect],
      ),
    ).toEqual([]);
  });

  it('allows a latest failure when its linked defects are closed', () => {
    const failed = makeExecution('failed', 'Blocked');
    const closedDefect = makeDefect({
      testCaseId: testCase.id,
      executionId: failed.id,
      status: 'Closed',
    });

    expect(
      getFailedOrBlockedTestsWithoutActiveDefects(
        [testCase],
        [failed],
        [closedDefect],
      ),
    ).toHaveLength(1);
  });

  it('identifies only failed or blocked latest tests without active defects', () => {
    const testCases = [
      { ...testCase, id: 'tc-001', name: 'TC-001' },
      { ...testCase, id: 'tc-002', name: 'TC-002' },
      { ...testCase, id: 'tc-003', name: 'TC-003' },
      { ...testCase, id: 'tc-004', name: 'TC-004' },
    ];
    const executions = [
      { ...makeExecution('execution-1', 'Failed'), testCaseId: 'tc-001' },
      { ...makeExecution('execution-2', 'Blocked'), testCaseId: 'tc-002' },
      { ...makeExecution('execution-3', 'Failed'), testCaseId: 'tc-003' },
      { ...makeExecution('execution-4', 'Passed'), testCaseId: 'tc-004' },
    ];
    const linkedDefect = makeDefect({
      id: 'linked-defect',
      testCaseId: 'tc-003',
      executionId: 'execution-3',
      status: 'Open',
    });

    expect(
      getFailedOrBlockedTestsWithoutActiveDefects(
        testCases,
        executions,
        [linkedDefect],
      ).map((result) => result.testCase.name),
    ).toEqual(['TC-001', 'TC-002']);

    const tc001Defect = makeDefect({
      id: 'tc-001-defect',
      testCaseId: 'tc-001',
      executionId: 'execution-1',
      status: 'In Progress',
    });
    expect(
      getFailedOrBlockedTestsWithoutActiveDefects(
        testCases,
        executions,
        [linkedDefect, tc001Defect],
      ).map((result) => result.testCase.name),
    ).toEqual(['TC-002']);
  });

  it('filters searchable fields and traceability options', () => {
    const linkedDefect = makeDefect({
      defectId: 'DEF-0003',
      title: 'Checkout failure',
      projectId: 'project-1',
      executionId: 'execution-1',
      severity: 'Critical',
      priority: 'High',
      assigneeName: 'Alex',
      externalSystem: 'Jira',
      externalIssueKey: 'SHOP-17',
      externalIssueUrl: 'https://example.com/SHOP-17',
    });

    const filtered = filterDefects([linkedDefect], {
      ...EMPTY_DEFECT_FILTERS,
      searchQuery: 'shop-17',
      projectId: 'project-1',
      severity: 'Critical',
      priority: 'High',
      assignee: 'Alex',
      externalSystem: 'Jira',
      linkedToExecution: 'yes',
      externalIssueLinked: 'yes',
    });

    expect(filtered).toEqual([linkedDefect]);
  });

  it('compares defects by readable ID, title, and dates', () => {
    const first = makeDefect({
      defectId: 'DEF-0001',
      title: 'Alpha',
      updatedDate: '2026-01-01T00:00:00.000Z',
    });
    const second = makeDefect({
      id: 'defect-2',
      defectId: 'DEF-0002',
      title: 'Beta',
      updatedDate: '2026-01-02T00:00:00.000Z',
    });

    expect(compareDefects(first, second, 'defectId')).toBeLessThan(0);
    expect(compareDefects(first, second, 'title')).toBeLessThan(0);
    expect(compareDefects(first, second, 'updatedDate')).toBeLessThan(0);
  });
});

describe('defect storage', () => {
  it('saves and loads valid defects from the dedicated key', () => {
    const defect = makeDefect();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    saveDefects([defect], storage);

    expect(values.has(DEFECT_STORAGE_KEY)).toBe(true);
    expect(loadDefects(storage)).toEqual([defect]);
  });
});
