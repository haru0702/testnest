import type { TestCase } from '../testCases/testCase';

export const EXECUTION_STATUSES = [
  'Passed',
  'Failed',
  'Blocked',
  'No Run',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];
export type ExecutionMode = 'quick' | 'detailed';

export type StepExecutionResult = {
  testStepId: string;
  stepNumber: number;
  stepDescription: string;
  expectedResult: string;
  actualResult: string;
  status: ExecutionStatus;
};

export type TestExecution = {
  id: string;
  executionMode: ExecutionMode;
  projectId: string;
  scenarioId: string;
  testCaseId: string;
  overallStatus: ExecutionStatus;
  executionDate: string;
  notes: string;
  stepResults: StepExecutionResult[];
};

export type ExecutionStatusCounts = Record<ExecutionStatus, number>;

type ExecutionRecordInput = Omit<
  TestExecution,
  'executionMode' | 'stepResults'
>;

export function createQuickExecutionRecord(
  input: ExecutionRecordInput,
): TestExecution {
  return {
    ...input,
    executionMode: 'quick',
    stepResults: [],
  };
}

export function createDetailedExecutionRecord(
  input: ExecutionRecordInput & { stepResults: StepExecutionResult[] },
): TestExecution {
  return {
    ...input,
    executionMode: 'detailed',
  };
}

export function calculateOverallStatus(
  stepResults: readonly Pick<StepExecutionResult, 'status'>[],
): ExecutionStatus {
  if (stepResults.some((step) => step.status === 'Failed')) {
    return 'Failed';
  }

  if (stepResults.some((step) => step.status === 'Blocked')) {
    return 'Blocked';
  }

  if (
    stepResults.length > 0 &&
    stepResults.every((step) => step.status === 'Passed')
  ) {
    return 'Passed';
  }

  return 'No Run';
}

export function getLatestExecutionsByTestCase(
  executions: readonly TestExecution[],
) {
  const latestExecutions = new Map<string, TestExecution>();

  executions.forEach((execution) => {
    const currentLatest = latestExecutions.get(execution.testCaseId);

    if (
      !currentLatest ||
      execution.executionDate >= currentLatest.executionDate
    ) {
      latestExecutions.set(execution.testCaseId, execution);
    }
  });

  return latestExecutions;
}

export function getLatestExecutionStatusCounts(
  testCases: readonly Pick<TestCase, 'id'>[],
  executions: readonly TestExecution[],
): ExecutionStatusCounts {
  const counts: ExecutionStatusCounts = {
    Passed: 0,
    Failed: 0,
    Blocked: 0,
    'No Run': 0,
  };
  const latestExecutions = getLatestExecutionsByTestCase(executions);

  testCases.forEach((testCase) => {
    const latestStatus =
      latestExecutions.get(testCase.id)?.overallStatus ?? 'No Run';
    counts[latestStatus] += 1;
  });

  return counts;
}

export function getTestCaseExecutionHistory(
  executions: readonly TestExecution[],
  testCaseId: string,
) {
  return executions
    .filter((execution) => execution.testCaseId === testCaseId)
    .sort((first, second) =>
      second.executionDate.localeCompare(first.executionDate),
    );
}
