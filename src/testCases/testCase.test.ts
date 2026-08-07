import {
  SCENARIO_NAME_DUPLICATE_ERROR,
  SCENARIO_NAME_REQUIRED_ERROR,
  STEP_DESCRIPTION_REQUIRED_ERROR,
  STEP_EXPECTED_RESULT_REQUIRED_ERROR,
  TEST_CASE_NAME_DUPLICATE_ERROR,
  TEST_CASE_NAME_REQUIRED_ERROR,
  TEST_STEPS_REQUIRED_ERROR,
  getScenarioNameError,
  getTestCaseNameError,
  getTestStepErrors,
  normalizeScenarioValues,
  normalizeTestCaseValues,
  type TestCase,
  type TestScenario,
} from './testCase';

const scenario: TestScenario = {
  id: 'scenario-1',
  name: 'Login',
  description: 'Login coverage',
  projectId: 'project-1',
  createdDate: '2026-08-08T00:00:00.000Z',
  updatedDate: '2026-08-08T00:00:00.000Z',
};

const testCase: TestCase = {
  id: 'case-1',
  name: 'Valid credentials',
  description: 'Successful login',
  precondition: 'A user account exists',
  steps: [
    {
      id: 'step-1',
      description: 'Enter valid credentials',
      expectedResult: 'Credentials are accepted',
    },
  ],
  scenarioId: scenario.id,
  projectId: scenario.projectId,
  createdDate: '2026-08-08T00:00:00.000Z',
  updatedDate: '2026-08-08T00:00:00.000Z',
};

describe('scenario name rules', () => {
  it('requires a scenario name', () => {
    expect(getScenarioNameError('   ', [], 'project-1')).toBe(
      SCENARIO_NAME_REQUIRED_ERROR,
    );
  });

  it('prevents case-insensitive duplicates within a project', () => {
    expect(getScenarioNameError('  login  ', [scenario], 'project-1')).toBe(
      SCENARIO_NAME_DUPLICATE_ERROR,
    );
  });

  it('allows the same scenario name in different projects', () => {
    expect(getScenarioNameError('Login', [scenario], 'project-2')).toBeNull();
  });
});

describe('test case name rules', () => {
  it('requires a test case name', () => {
    expect(getTestCaseNameError('   ', [], scenario.id)).toBe(
      TEST_CASE_NAME_REQUIRED_ERROR,
    );
  });

  it('prevents case-insensitive duplicates within a scenario', () => {
    expect(
      getTestCaseNameError('  VALID CREDENTIALS  ', [testCase], scenario.id),
    ).toBe(TEST_CASE_NAME_DUPLICATE_ERROR);
  });

  it('allows the same test case name in different scenarios', () => {
    expect(
      getTestCaseNameError('Valid credentials', [testCase], 'scenario-2'),
    ).toBeNull();
  });
});

describe('test step rules', () => {
  it('requires at least one test step', () => {
    expect(getTestStepErrors([])).toEqual([TEST_STEPS_REQUIRED_ERROR]);
  });

  it('requires a description and expected result for every step', () => {
    expect(
      getTestStepErrors([
        { id: 'step-1', description: '   ', expectedResult: '   ' },
      ]),
    ).toEqual([
      STEP_DESCRIPTION_REQUIRED_ERROR,
      STEP_EXPECTED_RESULT_REQUIRED_ERROR,
    ]);
  });
});

describe('text normalization', () => {
  it('trims scenario and test case fields, including steps', () => {
    expect(
      normalizeScenarioValues({ name: '  Login  ', description: '  Auth  ' }),
    ).toEqual({ name: 'Login', description: 'Auth' });

    expect(
      normalizeTestCaseValues({
        name: '  Valid credentials  ',
        description: '  Successful login  ',
        precondition: '  Account exists  ',
        steps: [
          {
            id: 'step-1',
            description: '  Enter credentials  ',
            expectedResult: '  Login succeeds  ',
          },
        ],
      }),
    ).toEqual({
      name: 'Valid credentials',
      description: 'Successful login',
      precondition: 'Account exists',
      steps: [
        {
          id: 'step-1',
          description: 'Enter credentials',
          expectedResult: 'Login succeeds',
        },
      ],
    });
  });
});
