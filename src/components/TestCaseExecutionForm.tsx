import { useState, type FormEvent } from 'react';
import {
  EXECUTION_STATUSES,
  calculateOverallStatus,
  type ExecutionStatus,
  type StepExecutionResult,
} from '../executions/execution';
import type { TestCase } from '../testCases/testCase';
import { StatusBadge } from './StatusBadge';

type TestCaseExecutionFormProps = {
  testCase: TestCase;
  onSave: (
    stepResults: StepExecutionResult[],
    notes: string,
    overallStatus: ExecutionStatus,
  ) => void;
  onCancel: () => void;
};

export function TestCaseExecutionForm({
  testCase,
  onSave,
  onCancel,
}: TestCaseExecutionFormProps) {
  const [stepResults, setStepResults] = useState<StepExecutionResult[]>(() =>
    testCase.steps.map((step, index) => ({
      testStepId: step.id,
      stepNumber: index + 1,
      stepDescription: step.description,
      expectedResult: step.expectedResult,
      actualResult: '',
      status: 'No Run',
    })),
  );
  const [notes, setNotes] = useState('');
  const [bulkStatus, setBulkStatus] = useState<ExecutionStatus>('Passed');
  const overallStatus = calculateOverallStatus(stepResults);

  function applyStatusToAll(status: ExecutionStatus) {
    setStepResults((currentResults) =>
      currentResults.map((result) => ({ ...result, status })),
    );
  }

  function updateStep(
    testStepId: string,
    field: 'actualResult' | 'status',
    value: string,
  ) {
    setStepResults((currentResults) =>
      currentResults.map((result) =>
        result.testStepId === testStepId
          ? { ...result, [field]: value }
          : result,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(
      stepResults.map((result) => ({
        ...result,
        actualResult: result.actualResult.trim(),
      })),
      notes.trim(),
      overallStatus,
    );
  }

  return (
    <section
      aria-labelledby="execution-form-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-teal-700">Detailed Run</p>
          <h3
            id="execution-form-title"
            className="mt-1 text-xl font-semibold text-slate-950"
          >
            {testCase.name}
          </h3>
        </div>
        <output
          aria-label="Overall Status"
          className="flex items-center gap-2 text-sm font-medium text-slate-700"
        >
          Overall Status
          <StatusBadge status={overallStatus} />
        </output>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <section
          aria-label="Bulk step actions"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <button
            type="button"
            className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            onClick={() => applyStatusToAll('Passed')}
          >
            Mark All Passed
          </button>
          <div className="min-w-52 flex-1 sm:max-w-xs">
            <label
              className="block text-sm font-medium text-slate-800"
              htmlFor="bulk-step-status"
            >
              Apply Status to All Steps
            </label>
            <select
              id="bulk-step-status"
              className="testnest-select mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              value={bulkStatus}
              onChange={(event) =>
                setBulkStatus(event.target.value as ExecutionStatus)
              }
            >
              {EXECUTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={() => applyStatusToAll(bulkStatus)}
          >
            Apply
          </button>
        </section>

        <ol className="space-y-4">
          {stepResults.map((result) => (
            <li
              key={result.testStepId}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-semibold text-slate-950">
                Step {result.stepNumber}
              </p>
              <dl className="mt-3 grid gap-3 text-sm lg:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-700">
                    Step Description
                  </dt>
                  <dd className="mt-1 leading-6 text-slate-950">
                    {result.stepDescription}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">
                    Expected Result
                  </dt>
                  <dd className="mt-1 leading-6 text-slate-950">
                    {result.expectedResult}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                <div>
                  <label
                    className="block text-sm font-medium text-slate-800"
                    htmlFor={`execution-${result.testStepId}-actual-result`}
                  >
                    Step {result.stepNumber} Actual Result
                  </label>
                  <textarea
                    id={`execution-${result.testStepId}-actual-result`}
                    rows={3}
                    className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    value={result.actualResult}
                    onChange={(event) =>
                      updateStep(
                        result.testStepId,
                        'actualResult',
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-slate-800"
                    htmlFor={`execution-${result.testStepId}-status`}
                  >
                    Step {result.stepNumber} Status
                  </label>
                  <select
                    id={`execution-${result.testStepId}-status`}
                    className="testnest-select mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    value={result.status}
                    onChange={(event) =>
                      updateStep(
                        result.testStepId,
                        'status',
                        event.target.value as ExecutionStatus,
                      )
                    }
                  >
                    {EXECUTION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="execution-notes"
          >
            Notes / Comments
          </label>
          <textarea
            id="execution-notes"
            rows={4}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Save Execution
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
