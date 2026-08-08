import { useState } from 'react';
import {
  buildDefectDraftFromExecution,
  type DefectFormValues,
} from '../defects/defect';
import {
  EXECUTION_STATUSES,
  type ExecutionMode,
  type ExecutionStatus,
  type TestExecution,
} from '../executions/execution';
import {
  compareDates,
  compareText,
  filterItems,
  getNextSortDirection,
  paginateItems,
  sortItems,
  TABLE_PAGE_SIZE,
  type SortDirection,
} from '../table/tableUtils';
import type { TestCase } from '../testCases/testCase';
import { StatusBadge } from './StatusBadge';
import {
  ClearFiltersButton,
  SortableTableHeader,
  TableFilterSelect,
  TableHeader,
  TableNoResults,
  TablePagination,
  TableResultCount,
  TableToolbar,
} from './TableControls';

type ExecutionHistoryProps = {
  executions: TestExecution[];
  testCase: TestCase;
  initialSelectedExecutionId?: string;
  onCreateDefect: (draft: DefectFormValues) => void;
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

type ExecutionSortKey = 'executionDate' | 'overallStatus';

export function ExecutionHistory({
  executions,
  testCase,
  initialSelectedExecutionId,
  onCreateDefect,
}: ExecutionHistoryProps) {
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(
    () =>
      executions.find((execution) => execution.id === initialSelectedExecutionId) ??
      null,
  );
  const [modeFilter, setModeFilter] = useState<'all' | ExecutionMode>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | ExecutionStatus
  >('all');
  const [sortKey, setSortKey] =
    useState<ExecutionSortKey>('executionDate');
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('descending');
  const [page, setPage] = useState(1);

  const filteredExecutions = filterItems(executions, [
    (execution) =>
      modeFilter === 'all' || execution.executionMode === modeFilter,
    (execution) =>
      statusFilter === 'all' || execution.overallStatus === statusFilter,
  ]);
  const sortedExecutions = sortItems(
    filteredExecutions,
    (first, second) =>
      sortKey === 'executionDate'
        ? compareDates(first.executionDate, second.executionDate)
        : compareText(first.overallStatus, second.overallStatus),
    sortDirection,
  );
  const paginatedExecutions = paginateItems(sortedExecutions, page);

  function handleSort(nextSortKey: ExecutionSortKey) {
    setSortDirection(
      getNextSortDirection(sortKey, nextSortKey, sortDirection),
    );
    setSortKey(nextSortKey);
    setPage(1);
  }

  function clearFilters() {
    setModeFilter('all');
    setStatusFilter('all');
    setSortKey('executionDate');
    setSortDirection('descending');
    setPage(1);
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
          <div className="mt-4">
            <TableToolbar>
              <TableFilterSelect
                id="execution-mode-filter"
                label="Filter by Execution Mode"
                value={modeFilter}
                options={[
                  { value: 'all', label: 'All Modes' },
                  { value: 'quick', label: 'Quick Run' },
                  { value: 'detailed', label: 'Detailed Run' },
                ]}
                onChange={(value) => {
                  setModeFilter(value as 'all' | ExecutionMode);
                  setPage(1);
                }}
              />
              <TableFilterSelect
                id="execution-status-filter"
                label="Filter by Status"
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  ...EXECUTION_STATUSES.map((status) => ({
                    value: status,
                    label: status,
                  })),
                ]}
                onChange={(value) => {
                  setStatusFilter(value as 'all' | ExecutionStatus);
                  setPage(1);
                }}
              />
              <ClearFiltersButton onClick={clearFilters} />
            </TableToolbar>
          </div>

          <div className="my-3">
            <TableResultCount count={filteredExecutions.length} />
          </div>

          {filteredExecutions.length === 0 ? (
            <TableNoResults itemName="executions" onClear={clearFilters} />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table
                  className="min-w-full divide-y divide-slate-200"
                  aria-label="Execution History"
                >
                  <thead className="bg-slate-50">
                    <tr>
                      <SortableTableHeader
                        label="Execution Date"
                        sortKey="executionDate"
                        activeSortKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <TableHeader label="Execution Mode" />
                      <SortableTableHeader
                        label="Overall Status"
                        sortKey="overallStatus"
                        activeSortKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <TableHeader label="Notes" />
                      <TableHeader label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedExecutions.items.map((execution, index) => (
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
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`View execution details ${(paginatedExecutions.page - 1) * TABLE_PAGE_SIZE + index + 1}`}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                            onClick={() => setSelectedExecution(execution)}
                          >
                            View Details
                          </button>
                          {execution.overallStatus === 'Failed' || execution.overallStatus === 'Blocked' ? (
                            <button
                              type="button"
                              aria-label={`Create defect from ${execution.overallStatus} execution ${(paginatedExecutions.page - 1) * TABLE_PAGE_SIZE + index + 1}`}
                              className="rounded-md border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                              onClick={() => onCreateDefect(buildDefectDraftFromExecution(execution, testCase))}
                            >
                              Create Defect
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={paginatedExecutions.page}
                totalPages={paginatedExecutions.totalPages}
                onPageChange={setPage}
              />
            </>
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
          {selectedExecution.overallStatus === 'Failed' || selectedExecution.overallStatus === 'Blocked' ? (
            <button
              type="button"
              className="mt-4 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
              onClick={() => onCreateDefect(buildDefectDraftFromExecution(selectedExecution, testCase))}
            >
              Create Defect from Execution
            </button>
          ) : null}
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
                  {result.status === 'Failed' || result.status === 'Blocked' ? (
                    <button
                      type="button"
                      className="mt-3 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                      onClick={() =>
                        onCreateDefect(
                          buildDefectDraftFromExecution(
                            selectedExecution,
                            testCase,
                            result,
                          ),
                        )
                      }
                    >
                      Create Defect from Step {result.stepNumber}
                    </button>
                  ) : null}
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
