import type { ExecutionStatus } from '../executions/execution';
import type { TestCase } from '../testCases/testCase';
import type { SortDirection } from '../table/tableUtils';
import { StatusBadge } from './StatusBadge';
import { SortableTableHeader, TableHeader } from './TableControls';

export type TestCaseSortKey = 'name' | 'createdDate' | 'updatedDate';

type TestCaseTableProps = {
  testCases: TestCase[];
  latestStatuses: ReadonlyMap<string, ExecutionStatus>;
  sortKey: TestCaseSortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: TestCaseSortKey) => void;
  onEdit: (testCase: TestCase) => void;
  onRequestDelete: (testCase: TestCase) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function TestCaseTable({
  testCases,
  latestStatuses,
  sortKey,
  sortDirection,
  onSort,
  onEdit,
  onRequestDelete,
  canEdit = true,
  canDelete = true,
}: TestCaseTableProps) {
  const showActions = canEdit || canDelete;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table
        className="min-w-full divide-y divide-slate-200"
        aria-label="Scenario Test Cases"
      >
        <thead className="bg-slate-50">
          <tr>
            <SortableTableHeader
              label="Test Case Name"
              sortKey="name"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <TableHeader label="Test Description" />
            <TableHeader label="Precondition" />
            <TableHeader label="Latest Status" />
            <TableHeader label="Test Steps" />
            <SortableTableHeader
              label="Created Date"
              sortKey="createdDate"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              label="Updated Date"
              sortKey="updatedDate"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            {showActions ? <TableHeader label="Actions" /> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {testCases.map((testCase) => (
            <tr key={testCase.id}>
              <th
                scope="row"
                className="min-w-44 px-4 py-4 text-left align-top text-sm font-semibold text-slate-950"
              >
                {testCase.name}
              </th>
              <td className="min-w-56 max-w-sm px-4 py-4 align-top text-sm leading-6 text-slate-600">
                {testCase.description || 'No description'}
              </td>
              <td className="min-w-56 max-w-sm px-4 py-4 align-top text-sm leading-6 text-slate-600">
                {testCase.precondition || 'No precondition'}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm">
                <StatusBadge
                  status={latestStatuses.get(testCase.id) ?? 'No Run'}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">
                {testCase.steps.length}{' '}
                {testCase.steps.length === 1 ? 'step' : 'steps'}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">
                {formatDate(testCase.createdDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">
                {formatDate(testCase.updatedDate)}
              </td>
              {showActions ? <td className="whitespace-nowrap px-4 py-4 align-top text-sm">
                <div className="flex gap-2">
                  {canEdit ? <button
                    type="button"
                    aria-label={`Edit ${testCase.name}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                    onClick={() => onEdit(testCase)}
                  >
                    Edit
                  </button> : null}
                  {canDelete ? <button
                    type="button"
                    aria-label={`Delete ${testCase.name}`}
                    className="rounded-md border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                    onClick={() => onRequestDelete(testCase)}
                  >
                    Delete
                  </button> : null}
                </div>
              </td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
