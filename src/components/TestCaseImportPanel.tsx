import { useState, type ChangeEvent } from 'react';
import type { Project } from '../projects/project';
import { parseTestCaseImportWorkbook } from '../testCases/testCaseSpreadsheet';
import {
  buildTestCaseImportPreview,
  createImportedTestCases,
  type ImportPreviewStatus,
  type TestCaseImportPreview,
} from '../testCases/testCaseTransfer';
import type { TestCase, TestScenario } from '../testCases/testCase';

type TestCaseImportPanelProps = {
  projects: Project[];
  scenarios: TestScenario[];
  existingTestCases: TestCase[];
  onImport: (testCases: TestCase[]) => void;
  onCancel: () => void;
};

const statusClasses: Record<ImportPreviewStatus, string> = {
  valid: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  duplicate: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  invalid: 'bg-rose-50 text-rose-800 ring-rose-600/20',
};

export function TestCaseImportPanel({
  projects,
  scenarios,
  existingTestCases,
  onImport,
  onCancel,
}: TestCaseImportPanelProps) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<TestCaseImportPreview | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setPreview(null);
    setErrors([]);
    setFileName(file?.name ?? '');

    if (!file) {
      return;
    }

    if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      setErrors(['Select a valid .xlsx workbook.']);
      return;
    }

    setIsParsing(true);

    try {
      const parseResult = await parseTestCaseImportWorkbook(
        await file.arrayBuffer(),
      );

      if (parseResult.errors.length > 0) {
        setErrors(parseResult.errors);
        return;
      }

      setPreview(
        buildTestCaseImportPreview(parseResult.rows, {
          projects,
          scenarios,
          existingTestCases,
        }),
      );
    } catch {
      setErrors([
        'The selected file could not be read as a valid .xlsx workbook.',
      ]);
    } finally {
      setIsParsing(false);
    }
  }

  function handleImport() {
    if (!preview) {
      return;
    }

    onImport(createImportedTestCases(preview));
  }

  return (
    <section
      aria-labelledby="test-case-import-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3
            id="test-case-import-title"
            className="text-xl font-semibold text-slate-950"
          >
            Import Test Cases
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Upload an .xlsx workbook to validate and preview its Test Cases
            before anything is saved.
          </p>
        </div>
        {!preview ? (
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={onCancel}
          >
            Cancel Import
          </button>
        ) : null}
      </div>

      <div className="mt-6 max-w-xl">
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="test-case-import-file"
        >
          Excel file
        </label>
        <input
          id="test-case-import-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:border-r file:border-slate-300 file:bg-slate-50 file:px-4 file:py-2.5 file:font-semibold file:text-slate-700 hover:file:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          onChange={handleFileChange}
        />
        {fileName ? (
          <p className="mt-2 text-sm text-slate-600">Selected: {fileName}</p>
        ) : null}
        {isParsing ? (
          <p className="mt-2 text-sm font-medium text-teal-700" role="status">
            Parsing workbook...
          </p>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div
          role="alert"
          className="mt-5 border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <p className="font-semibold">The workbook could not be previewed.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview ? (
        <section aria-labelledby="import-preview-title" className="mt-7">
          <h4
            id="import-preview-title"
            className="text-lg font-semibold text-slate-950"
          >
            Import Preview
          </h4>

          <div className="mt-4 grid border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-5">
            <PreviewMetric
              label="Test Cases detected"
              value={preview.testCasesDetected}
            />
            <PreviewMetric
              label="Test Steps detected"
              value={preview.testStepsDetected}
            />
            <PreviewMetric
              label="Valid Test Cases"
              value={preview.validTestCases}
            />
            <PreviewMetric
              label="Duplicate Test Cases"
              value={preview.duplicateTestCases}
            />
            <PreviewMetric
              label="Invalid Test Cases"
              value={preview.invalidTestCases}
            />
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table
              className="min-w-full divide-y divide-slate-200"
              aria-label="Test Case Import Preview"
            >
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Project',
                    'Scenario',
                    'Test Case',
                    'Steps',
                    'Status',
                    'Validation Messages',
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
                {preview.testCases.map((testCase) => (
                  <tr key={testCase.key}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {testCase.projectName || 'Missing'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {testCase.scenarioName || 'Missing'}
                    </td>
                    <th
                      scope="row"
                      className="min-w-44 px-4 py-4 text-left text-sm font-semibold text-slate-950"
                    >
                      {testCase.testCaseName || 'Missing'}
                    </th>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {testCase.steps.length}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClasses[testCase.status]}`}
                      >
                        {testCase.status}
                      </span>
                    </td>
                    <td className="min-w-80 max-w-xl px-4 py-4 text-sm leading-6 text-slate-600">
                      {testCase.messages.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-5">
                          {testCase.messages.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      ) : (
                        'Ready to import'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              disabled={preview.validTestCases === 0}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              onClick={handleImport}
            >
              Import Valid Test Cases
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
              onClick={onCancel}
            >
              Cancel Import
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <article
      aria-label={`${label}: ${value}`}
      className="border-b border-slate-200 px-4 py-4 last:border-b-0 sm:border-r lg:border-b-0 lg:last:border-r-0"
    >
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}
