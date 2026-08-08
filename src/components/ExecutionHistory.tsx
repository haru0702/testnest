import { useState } from 'react';
import {
  EXECUTION_STATUSES,
  type ExecutionMode,
  type ExecutionStatus,
  type TestExecution,
} from '../executions/execution';
import { StatusBadge } from './StatusBadge';

type ExecutionHistoryProps = {
  executions: TestExecution[];
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatExecutionMode(mode: ExecutionMode) {
  return mode === 'quick' ? 'Quick Run' : 'Detailed Run';
}

export function ExecutionHistory({ executions }: ExecutionHistoryProps) {
  const [selectedExecution, setSelectedExecution] =
    useState<TestExecution | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | ExecutionMode>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ExecutionStatus
  >('all');
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>(
    'newest',
  );

  const filteredExecutions = executions
    .filter(
      (execution) =>
        (modeFilter === 'all' || execution.executionMode === modeFilter) &&
        (statusFilter === 'all' || execution.overallStatus === statusFilter),
    )
    .sort((first, second) => {
      const difference =
        new Date(second.executionDate).getTime() -
        new Date(first.executionDate).getTime();

      return sortDirection === 'newest' ? difference : -difference;
    });

  function clearFilters() {
    setModeFilter('all');
    setStatusFilter('all');
    setSortDirection('newest');
  }

  return (
    <section aria-labelledby="execution-history-title">
      <h3
        id="execution-history-title"
        className="text-xl font-semibold text-slate-950"
      >
        Execution History
      </h3>

      {executions.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-slate-950">
            No executions recorded yet
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Filter by Execution Mode
              <select
                className="testnest-select"
                value={modeFilter}
                onChange={(event) =>
                  setModeFilter(event.target.value as 'all' | ExecutionMode)
                }
              >
                <option value="all">All Modes</option>
                <option value="quick">Quick Run</option>
                <option value="detailed">Detailed Run</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Filter by Status
              <select
                className="testnest-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | ExecutionStatus)
                }
              >
                <option value="all">All Statuses</option>
                {EXECUTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Sort by Execution Date
              <select
                className="testnest-select"
                value={sortDirection}
                onChange={(event) =>
                  setSortDirection(event.target.value as 'newest' | 'oldest')
                }
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </label>
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-600" aria-live="polite">
            {filteredExecutions.length}{' '}
            {filteredExecutions.length === 1
              ? 'matching execution'
              : 'matching executions'}
          </p>

          {filteredExecutions.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="font-semibold text-slate-950">
                No executions match these filters
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table
                className="min-w-full divide-y divide-slate-200"
                aria-label="Execution History"
              >
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      'Execution Date',
                      'Execution Mode',
                      'Overall Status',
                      'Notes',
                      'Actions',
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredExecutions.map((execution, index) => (
                    <tr key={execution.id}>
                      <th
                        scope="row"
                        className="whitespace-nowrap px-4 py-4 text-left text-sm font-medium text-slate-950"
                      >
                        {formatDate(execution.executionDate)}
                      </th>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        {formatExecutionMode(execution.executionMode)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <StatusBadge status={execution.overallStatus} />
                      </td>
                      <td className="min-w-64 max-w-lg px-4 py-4 text-sm leading-6 text-slate-600">
                        {execution.notes || 'No notes'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <button
                          type="button"
                          aria-label={`View execution details ${index + 1}`}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                          onClick={() => setSelectedExecution(execution)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedExecution ? (
        <section
          aria-labelledby="execution-details-title"
          className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4
                id="execution-details-title"
                className="text-lg font-semibold text-slate-950"
              >
                Execution Details
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(selectedExecution.executionDate)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatExecutionMode(selectedExecution.executionMode)}
              </p>
            </div>
            <StatusBadge status={selectedExecution.overallStatus} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            <span className="font-medium text-slate-800">Notes:</span>{' '}
            {selectedExecution.notes || 'No notes'}
          </p>
          {selectedExecution.executionMode === 'quick' ? (
            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Step-level results were not recorded for this Quick Run.
            </p>
          ) : (
            <ol className="mt-5 space-y-4">
              {selectedExecution.stepResults.map((result) => (
                <li
                  key={result.testStepId}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-950">
                      Step {result.stepNumber}
                    </p>
                    <StatusBadge status={result.status} />
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm lg:grid-cols-3">
                    <div>
                      <dt className="font-medium text-slate-700">
                        Description
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
                    <div>
                      <dt className="font-medium text-slate-700">
                        Actual Result
                      </dt>
                      <dd className="mt-1 leading-6 text-slate-950">
                        {result.actualResult || 'No actual result recorded'}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            className="mt-5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={() => setSelectedExecution(null)}
          >
            Close Details
          </button>
        </section>
      ) : null}
    </section>
  );
}
