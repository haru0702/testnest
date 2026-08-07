import { useState, type FormEvent } from 'react';
import type {
  TestCase,
  TestCaseFormErrors,
  TestCaseFormValues,
  TestStep,
} from '../testCases/testCase';

type TestCaseFormProps = {
  testCase?: TestCase;
  onSubmit: (values: TestCaseFormValues) => TestCaseFormErrors | null;
  onCancel: () => void;
};

function createEmptyStep(): TestStep {
  return {
    id: crypto.randomUUID(),
    description: '',
    expectedResult: '',
  };
}

export function TestCaseForm({
  testCase,
  onSubmit,
  onCancel,
}: TestCaseFormProps) {
  const [name, setName] = useState(testCase?.name ?? '');
  const [description, setDescription] = useState(testCase?.description ?? '');
  const [precondition, setPrecondition] = useState(
    testCase?.precondition ?? '',
  );
  const [steps, setSteps] = useState<TestStep[]>(
    testCase?.steps ?? [createEmptyStep()],
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  function updateStep(
    stepId: string,
    field: 'description' | 'expectedResult',
    value: string,
  ) {
    setSteps((currentSteps) =>
      currentSteps.map((step) =>
        step.id === stepId ? { ...step, [field]: value } : step,
      ),
    );
    setStepErrors([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = onSubmit({
      name,
      description,
      precondition,
      steps,
    });

    if (validationErrors) {
      setNameError(validationErrors.nameError);
      setStepErrors(validationErrors.stepErrors);
    }
  }

  return (
    <section
      aria-labelledby="test-case-form-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h3
        id="test-case-form-title"
        className="text-xl font-semibold text-slate-950"
      >
        {testCase ? 'Edit Test Case' : 'Create Test Case'}
      </h3>

      <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="test-case-name"
          >
            Test Case Name
          </label>
          <input
            id="test-case-name"
            type="text"
            autoFocus
            aria-describedby={nameError ? 'test-case-name-error' : undefined}
            aria-invalid={Boolean(nameError)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
            }}
          />
          {nameError ? (
            <p id="test-case-name-error" className="mt-2 text-sm text-rose-700">
              {nameError}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="test-case-description"
          >
            Test Description
          </label>
          <textarea
            id="test-case-description"
            rows={3}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="test-case-precondition"
          >
            Precondition
          </label>
          <textarea
            id="test-case-precondition"
            rows={3}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={precondition}
            onChange={(event) => setPrecondition(event.target.value)}
          />
        </div>

        <fieldset className="space-y-4 border-t border-slate-200 pt-5">
          <legend className="text-base font-semibold text-slate-950">
            Test Steps
          </legend>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              onClick={() => {
                setSteps((currentSteps) => [
                  ...currentSteps,
                  createEmptyStep(),
                ]);
                setStepErrors([]);
              }}
            >
              Add Test Step
            </button>
          </div>

          {stepErrors.length > 0 ? (
            <ul id="test-step-errors" className="space-y-1 text-sm text-rose-700">
              {stepErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          {steps.length === 0 ? (
            <p className="text-sm text-slate-600">No test steps added.</p>
          ) : (
            <ol className="space-y-4">
              {steps.map((step, index) => {
                const number = index + 1;
                const descriptionInvalid =
                  stepErrors.length > 0 && !step.description.trim();
                const expectedResultInvalid =
                  stepErrors.length > 0 && !step.expectedResult.trim();

                return (
                  <li
                    key={step.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">
                        Step {number}
                      </p>
                      <button
                        type="button"
                        aria-label={`Remove step ${number}`}
                        className="text-sm font-semibold text-rose-700 hover:text-rose-900"
                        onClick={() => {
                          setSteps((currentSteps) =>
                            currentSteps.filter(
                              (currentStep) => currentStep.id !== step.id,
                            ),
                          );
                          setStepErrors([]);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <label
                          className="block text-sm font-medium text-slate-800"
                          htmlFor={`step-${step.id}-description`}
                        >
                          Step {number} Description
                        </label>
                        <textarea
                          id={`step-${step.id}-description`}
                          rows={3}
                          aria-describedby={
                            descriptionInvalid ? 'test-step-errors' : undefined
                          }
                          aria-invalid={descriptionInvalid}
                          className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          value={step.description}
                          onChange={(event) =>
                            updateStep(
                              step.id,
                              'description',
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label
                          className="block text-sm font-medium text-slate-800"
                          htmlFor={`step-${step.id}-expected-result`}
                        >
                          Step {number} Expected Result
                        </label>
                        <textarea
                          id={`step-${step.id}-expected-result`}
                          rows={3}
                          aria-describedby={
                            expectedResultInvalid
                              ? 'test-step-errors'
                              : undefined
                          }
                          aria-invalid={expectedResultInvalid}
                          className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          value={step.expectedResult}
                          onChange={(event) =>
                            updateStep(
                              step.id,
                              'expectedResult',
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Save Test Case
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
