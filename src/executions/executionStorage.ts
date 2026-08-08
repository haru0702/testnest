import {
  EXECUTION_STATUSES,
  type ExecutionMode,
  type ExecutionStatus,
  type StepExecutionResult,
  type TestExecution,
} from './execution';

export const EXECUTION_STORAGE_KEY = 'testnest.executions';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;
type ReadWriteStorage = ReadStorage & WriteStorage;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isExecutionStatus(value: unknown): value is ExecutionStatus {
  return (
    typeof value === 'string' &&
    EXECUTION_STATUSES.includes(value as ExecutionStatus)
  );
}

function getExecutionMode(value: unknown): ExecutionMode | null {
  if (value === 'quick' || value === 'detailed') {
    return value;
  }

  return value === undefined ? 'detailed' : null;
}

function isStepExecutionResult(value: unknown): value is StepExecutionResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const stepResult = value as Record<string, unknown>;

  return (
    isString(stepResult.testStepId) &&
    typeof stepResult.stepNumber === 'number' &&
    isString(stepResult.stepDescription) &&
    isString(stepResult.expectedResult) &&
    isString(stepResult.actualResult) &&
    isExecutionStatus(stepResult.status)
  );
}

function parseTestExecution(value: unknown): TestExecution | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const execution = value as Record<string, unknown>;

  const executionMode = getExecutionMode(execution.executionMode);
  const isValid =
    isString(execution.id) &&
    isString(execution.projectId) &&
    isString(execution.scenarioId) &&
    isString(execution.testCaseId) &&
    isExecutionStatus(execution.overallStatus) &&
    isString(execution.executionDate) &&
    isString(execution.notes) &&
    Array.isArray(execution.stepResults) &&
    execution.stepResults.every(isStepExecutionResult) &&
    executionMode !== null;

  if (!isValid || executionMode === null) {
    return null;
  }

  return {
    ...(execution as unknown as TestExecution),
    executionMode,
  };
}

export function loadExecutions(
  storage: ReadStorage = window.localStorage,
) {
  try {
    const storedExecutions = storage.getItem(EXECUTION_STORAGE_KEY);

    if (!storedExecutions) {
      return [];
    }

    const parsedExecutions: unknown = JSON.parse(storedExecutions);

    return Array.isArray(parsedExecutions)
      ? parsedExecutions
          .map(parseTestExecution)
          .filter((execution): execution is TestExecution => execution !== null)
      : [];
  } catch {
    return [];
  }
}

export function saveExecutions(
  executions: readonly TestExecution[],
  storage: WriteStorage = window.localStorage,
) {
  storage.setItem(EXECUTION_STORAGE_KEY, JSON.stringify(executions));
}

function deleteMatchingExecutions(
  predicate: (execution: TestExecution) => boolean,
  storage: ReadWriteStorage,
) {
  saveExecutions(loadExecutions(storage).filter(predicate), storage);
}

export function deleteProjectExecutions(
  projectId: string,
  storage: ReadWriteStorage = window.localStorage,
) {
  deleteMatchingExecutions(
    (execution) => execution.projectId !== projectId,
    storage,
  );
}

export function deleteScenarioExecutions(
  scenarioId: string,
  storage: ReadWriteStorage = window.localStorage,
) {
  deleteMatchingExecutions(
    (execution) => execution.scenarioId !== scenarioId,
    storage,
  );
}

export function deleteTestCaseExecutions(
  testCaseId: string,
  storage: ReadWriteStorage = window.localStorage,
) {
  deleteMatchingExecutions(
    (execution) => execution.testCaseId !== testCaseId,
    storage,
  );
}
