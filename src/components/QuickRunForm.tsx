import { useState, type FormEvent } from 'react';
import {
  EXECUTION_STATUSES,
  type ExecutionStatus,
} from '../executions/execution';
import type { TestCase } from '../testCases/testCase';

type QuickRunFormProps = {
  testCase: TestCase;
  onSave: (overallStatus: ExecutionStatus, notes: string) => void;
  onCancel: () => void;
};

export function QuickRunForm({
  testCase,
  onSave,
  onCancel,
}: QuickRunFormProps) {
  const [overallStatus, setOverallStatus] =
    useState<ExecutionStatus>('No Run');
  const [notes, setNotes] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(overallStatus, notes.trim());
  }

  return (
    <section
      aria-labelledby="quick-run-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-sm font-medium text-teal-700">Quick Run</p>
      <h3
        id="quick-run-title"
        className="mt-1 text-xl font-semibold text-slate-950"
      >
        {testCase.name}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Record an overall result without individual step results.
      </p>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <div className="max-w-xs">
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="quick-run-status"
          >
            Overall Status
          </label>
          <select
            id="quick-run-status"
            className="testnest-select mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={overallStatus}
            onChange={(event) =>
              setOverallStatus(event.target.value as ExecutionStatus)
            }
          >
            {EXECUTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="quick-run-notes"
          >
            Notes / Comments
          </label>
          <textarea
            id="quick-run-notes"
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
            Save Quick Run
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
