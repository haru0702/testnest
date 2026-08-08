import { loadExecutions } from './executionStorage';

describe('execution storage', () => {
  it('treats execution records saved before modes existed as Detailed Runs', () => {
    const storedExecution = {
      id: 'legacy-run',
      projectId: 'project-1',
      scenarioId: 'scenario-1',
      testCaseId: 'case-1',
      overallStatus: 'Passed',
      executionDate: '2026-08-08T10:00:00.000Z',
      notes: 'Saved before execution modes were introduced.',
      stepResults: [
        {
          testStepId: 'step-1',
          stepNumber: 1,
          stepDescription: 'Complete the action',
          expectedResult: 'The action succeeds',
          actualResult: 'The action succeeded',
          status: 'Passed',
        },
      ],
    };
    const storage = {
      getItem: () => JSON.stringify([storedExecution]),
    };

    expect(loadExecutions(storage)).toEqual([
      { ...storedExecution, executionMode: 'detailed' },
    ]);
  });
});
