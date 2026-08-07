import type { TestCase } from '../testCases/testCase';

type TestCaseTableProps = {
  testCases: TestCase[];
  onEdit: (testCase: TestCase) => void;
  onRequestDelete: (testCase: TestCase) => void;
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
  onEdit,
  onRequestDelete,
}: TestCaseTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table
        className="min-w-full divide-y divide-slate-200"
        aria-label="Scenario Test Cases"
      >
        <thead className="bg-slate-50">
          <tr>
            {[
              'Test Case Name',
              'Test Description',
              'Precondition',
              'Test Steps',
              'Created Date',
              'Updated Date',
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
              <td className="min-w-80 max-w-xl px-4 py-4 align-top text-sm text-slate-700">
                <ol className="list-decimal space-y-3 pl-5">
                  {testCase.steps.map((step) => (
                    <li key={step.id}>
                      <p className="font-medium leading-6">{step.description}</p>
                      <p className="mt-1 leading-6 text-slate-500">
                        Expected: {step.expectedResult}
                      </p>
                    </li>
                  ))}
                </ol>
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">
                {formatDate(testCase.createdDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">
                {formatDate(testCase.updatedDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm">
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Edit ${testCase.name}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                    onClick={() => onEdit(testCase)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${testCase.name}`}
                    className="rounded-md border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                    onClick={() => onRequestDelete(testCase)}
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
