import {
  calculateOverallStatus,
  createQuickExecutionRecord,
  getLatestExecutionStatusCounts,
  type ExecutionMode,
  type ExecutionStatus,
  type TestExecution,
} from './execution';

function step(status: ExecutionStatus) {
  return { status };
}

function execution(
  id: string,
  testCaseId: string,
  overallStatus: ExecutionStatus,
  executionDate: string,
  executionMode: ExecutionMode = 'detailed',
): TestExecution {
  return {
    id,
    executionMode,
    projectId: 'project-1',
    scenarioId: 'scenario-1',
    testCaseId,
    overallStatus,
    executionDate,
    notes: '',
    stepResults: [],
  };
}

describe('execution status rules', () => {
  it('returns Passed when all steps pass', () => {
    expect(calculateOverallStatus([step('Passed'), step('Passed')])).toBe(
      'Passed',
    );
  });

  it('returns Failed when any step fails', () => {
    expect(
      calculateOverallStatus([
        step('Passed'),
        step('Blocked'),
        step('Failed'),
      ]),
    ).toBe('Failed');
  });

  it('returns Blocked when a step is blocked and none fail', () => {
    expect(calculateOverallStatus([step('Passed'), step('Blocked')])).toBe(
      'Blocked',
    );
  });

  it('returns No Run when steps are incomplete or not run', () => {
    expect(calculateOverallStatus([step('Passed'), step('No Run')])).toBe(
      'No Run',
    );
    expect(calculateOverallStatus([])).toBe('No Run');
  });
});

describe('quick run records', () => {
  const baseInput = {
    id: 'quick-run-1',
    projectId: 'project-1',
    scenarioId: 'scenario-1',
    testCaseId: 'case-1',
    executionDate: '2026-08-08T10:00:00.000Z',
    notes: 'Quick verification',
  };

  it('creates a Quick Run record without step-level results', () => {
    const quickRun = createQuickExecutionRecord({
      ...baseInput,
      overallStatus: 'Passed',
    });

    expect(quickRun.executionMode).toBe('quick');
    expect(quickRun.stepResults).toEqual([]);
  });

  it.each(['Passed', 'Failed', 'Blocked', 'No Run'] as const)(
    'stores a Quick Run with %s status',
    (overallStatus) => {
      expect(
        createQuickExecutionRecord({ ...baseInput, overallStatus })
          .overallStatus,
      ).toBe(overallStatus);
    },
  );
});

describe('dashboard execution counts', () => {
  it('uses the latest execution for each test case', () => {
    const counts = getLatestExecutionStatusCounts(
      [{ id: 'case-1' }],
      [
        execution(
          'run-1',
          'case-1',
          'Failed',
          '2026-08-08T10:00:00.000Z',
          'quick',
        ),
        execution(
          'run-2',
          'case-1',
          'Passed',
          '2026-08-08T11:00:00.000Z',
          'detailed',
        ),
      ],
    );

    expect(counts).toEqual({
      Passed: 1,
      Failed: 0,
      Blocked: 0,
      'No Run': 0,
    });
  });

  it('does not count older statuses and treats unexecuted cases as No Run', () => {
    const counts = getLatestExecutionStatusCounts(
      [{ id: 'case-1' }, { id: 'case-2' }],
      [
        execution(
          'run-1',
          'case-1',
          'Passed',
          '2026-08-08T10:00:00.000Z',
          'detailed',
        ),
        execution(
          'run-2',
          'case-1',
          'Blocked',
          '2026-08-08T12:00:00.000Z',
          'quick',
        ),
      ],
    );

    expect(counts).toEqual({
      Passed: 0,
      Failed: 0,
      Blocked: 1,
      'No Run': 1,
    });
  });
});
