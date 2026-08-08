import type { TestScenario } from '../testCases/testCase';
import type { SortDirection } from '../table/tableUtils';
import { SortableTableHeader, TableHeader } from './TableControls';

export type ScenarioSortKey = 'name' | 'createdDate' | 'updatedDate';

type ScenarioTableProps = {
  scenarios: TestScenario[];
  sortKey: ScenarioSortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: ScenarioSortKey) => void;
  onOpen: (scenario: TestScenario) => void;
  onEdit: (scenario: TestScenario) => void;
  onRequestDelete: (scenario: TestScenario) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function ScenarioTable({
  scenarios,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
  onEdit,
  onRequestDelete,
}: ScenarioTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table
        className="min-w-full divide-y divide-slate-200"
        aria-label="Test Scenarios"
      >
        <thead className="bg-slate-50">
          <tr>
            <SortableTableHeader
              label="Scenario Name"
              sortKey="name"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <TableHeader label="Description" />
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
            <TableHeader label="Actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {scenarios.map((scenario) => (
            <tr key={scenario.id}>
              <th
                scope="row"
                className="min-w-44 px-4 py-4 text-left text-sm font-semibold text-slate-950"
              >
                {scenario.name}
              </th>
              <td className="min-w-64 max-w-md px-4 py-4 text-sm leading-6 text-slate-600">
                {scenario.description || 'No description'}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                {formatDate(scenario.createdDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                {formatDate(scenario.updatedDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Open ${scenario.name}`}
                    className="rounded-md bg-teal-600 px-3 py-1.5 font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    onClick={() => onOpen(scenario)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${scenario.name}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                    onClick={() => onEdit(scenario)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${scenario.name}`}
                    className="rounded-md border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                    onClick={() => onRequestDelete(scenario)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
