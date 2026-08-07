import type { TestCase, TestScenario, TestStep } from './testCase';

export const SCENARIO_STORAGE_KEY = 'testnest.scenarios';
export const TEST_CASE_STORAGE_KEY = 'testnest.testCases';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;
type ReadWriteStorage = ReadStorage & WriteStorage;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isTestStep(value: unknown): value is TestStep {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const step = value as Record<string, unknown>;

  return (
    isString(step.id) &&
    isString(step.description) &&
    isString(step.expectedResult)
  );
}

function isTestScenario(value: unknown): value is TestScenario {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const scenario = value as Record<string, unknown>;

  return (
    isString(scenario.id) &&
    isString(scenario.name) &&
    isString(scenario.description) &&
    isString(scenario.projectId) &&
    isString(scenario.createdDate) &&
    isString(scenario.updatedDate)
  );
}

function isTestCase(value: unknown): value is TestCase {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const testCase = value as Record<string, unknown>;

  return (
    isString(testCase.id) &&
    isString(testCase.name) &&
    isString(testCase.description) &&
    isString(testCase.precondition) &&
    Array.isArray(testCase.steps) &&
    testCase.steps.every(isTestStep) &&
    isString(testCase.scenarioId) &&
    isString(testCase.projectId) &&
    isString(testCase.createdDate) &&
    isString(testCase.updatedDate)
  );
}

function loadCollection<T>(
  key: string,
  guard: (value: unknown) => value is T,
  storage: ReadStorage,
) {
  try {
    const storedValue = storage.getItem(key);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return Array.isArray(parsedValue) ? parsedValue.filter(guard) : [];
  } catch {
    return [];
  }
}

export function loadScenarios(
  storage: ReadStorage = window.localStorage,
) {
  return loadCollection(SCENARIO_STORAGE_KEY, isTestScenario, storage);
}

export function saveScenarios(
  scenarios: readonly TestScenario[],
  storage: WriteStorage = window.localStorage,
) {
  storage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarios));
}

export function loadTestCases(
  storage: ReadStorage = window.localStorage,
) {
  return loadCollection(TEST_CASE_STORAGE_KEY, isTestCase, storage);
}

export function saveTestCases(
  testCases: readonly TestCase[],
  storage: WriteStorage = window.localStorage,
) {
  storage.setItem(TEST_CASE_STORAGE_KEY, JSON.stringify(testCases));
}

export function deleteScenarioTestCases(
  scenarioId: string,
  storage: ReadWriteStorage = window.localStorage,
) {
  saveTestCases(
    loadTestCases(storage).filter(
      (testCase) => testCase.scenarioId !== scenarioId,
    ),
    storage,
  );
}

export function deleteProjectTestData(
  projectId: string,
  storage: ReadWriteStorage = window.localStorage,
) {
  saveScenarios(
    loadScenarios(storage).filter(
      (scenario) => scenario.projectId !== projectId,
    ),
    storage,
  );
  saveTestCases(
    loadTestCases(storage).filter(
      (testCase) => testCase.projectId !== projectId,
    ),
    storage,
  );
}
