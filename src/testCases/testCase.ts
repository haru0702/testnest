import type { AuditedRecord } from '../users/user';

export type TestScenario = AuditedRecord & {
  id: string;
  name: string;
  description: string;
  projectId: string;
  createdDate: string;
  updatedDate: string;
};

export type TestStep = {
  id: string;
  description: string;
  expectedResult: string;
};

export type TestCase = AuditedRecord & {
  id: string;
  name: string;
  description: string;
  precondition: string;
  steps: TestStep[];
  scenarioId: string;
  projectId: string;
  createdDate: string;
  updatedDate: string;
};

export type ScenarioFormValues = Pick<TestScenario, 'name' | 'description'>;

export type TestCaseFormValues = Pick<
  TestCase,
  'name' | 'description' | 'precondition' | 'steps'
>;

export type TestCaseFormErrors = {
  nameError: string | null;
  stepErrors: string[];
};

export const SCENARIO_NAME_REQUIRED_ERROR = 'Scenario Name is required.';
export const SCENARIO_NAME_DUPLICATE_ERROR =
  'A scenario with this name already exists in this project.';
export const TEST_CASE_NAME_REQUIRED_ERROR = 'Test Case Name is required.';
export const TEST_CASE_NAME_DUPLICATE_ERROR =
  'A test case with this name already exists in this scenario.';
export const TEST_STEPS_REQUIRED_ERROR =
  'At least one test step is required.';
export const STEP_DESCRIPTION_REQUIRED_ERROR =
  'Step Description is required for every test step.';
export const STEP_EXPECTED_RESULT_REQUIRED_ERROR =
  'Expected Result is required for every test step.';

export function normalizeName(name: string) {
  return name.trim();
}

export function getScenarioNameError(
  name: string,
  scenarios: readonly TestScenario[],
  projectId: string,
  excludedScenarioId?: string,
) {
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return SCENARIO_NAME_REQUIRED_ERROR;
  }

  const comparableName = normalizedName.toLocaleLowerCase();
  const isDuplicate = scenarios.some(
    (scenario) =>
      scenario.id !== excludedScenarioId &&
      scenario.projectId === projectId &&
      normalizeName(scenario.name).toLocaleLowerCase() === comparableName,
  );

  return isDuplicate ? SCENARIO_NAME_DUPLICATE_ERROR : null;
}

export function getTestCaseNameError(
  name: string,
  testCases: readonly TestCase[],
  scenarioId: string,
  excludedTestCaseId?: string,
) {
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return TEST_CASE_NAME_REQUIRED_ERROR;
  }

  const comparableName = normalizedName.toLocaleLowerCase();
  const isDuplicate = testCases.some(
    (testCase) =>
      testCase.id !== excludedTestCaseId &&
      testCase.scenarioId === scenarioId &&
      normalizeName(testCase.name).toLocaleLowerCase() === comparableName,
  );

  return isDuplicate ? TEST_CASE_NAME_DUPLICATE_ERROR : null;
}

export function getTestStepErrors(steps: readonly TestStep[]) {
  if (steps.length === 0) {
    return [TEST_STEPS_REQUIRED_ERROR];
  }

  const errors: string[] = [];

  if (steps.some((step) => !step.description.trim())) {
    errors.push(STEP_DESCRIPTION_REQUIRED_ERROR);
  }

  if (steps.some((step) => !step.expectedResult.trim())) {
    errors.push(STEP_EXPECTED_RESULT_REQUIRED_ERROR);
  }

  return errors;
}

export function normalizeScenarioValues(
  values: ScenarioFormValues,
): ScenarioFormValues {
  return {
    name: normalizeName(values.name),
    description: values.description.trim(),
  };
}

export function normalizeTestCaseValues(
  values: TestCaseFormValues,
): TestCaseFormValues {
  return {
    name: normalizeName(values.name),
    description: values.description.trim(),
    precondition: values.precondition.trim(),
    steps: values.steps.map((step) => ({
      ...step,
      description: step.description.trim(),
      expectedResult: step.expectedResult.trim(),
    })),
  };
}
