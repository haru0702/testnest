import { useState } from 'react';
import { ExecutionHistory } from '../components/ExecutionHistory';
import { QuickRunForm } from '../components/QuickRunForm';
import { TestCaseExecutionForm } from '../components/TestCaseExecutionForm';
import type { DefectExecutionContext } from '../components/DefectDetails';
import type { DefectFormValues } from '../defects/defect';
import {
  createDetailedExecutionRecord,
  createQuickExecutionRecord,
  type ExecutionMode,
  type ExecutionStatus,
  type StepExecutionResult,
  type TestExecution,
} from '../executions/execution';
import { getTestCaseExecutionHistory } from '../executions/execution';
import {
  loadExecutions,
  saveExecutions,
} from '../executions/executionStorage';
import { loadProjects } from '../projects/projectStorage';
import type { TestCase } from '../testCases/testCase';
import {
  loadScenarios,
  loadTestCases,
} from '../testCases/testCaseStorage';

type TestExecutionPageProps = {
  initialContext?: DefectExecutionContext | null;
  onCreateDefect?: (draft: DefectFormValues) => void;
};

export function TestExecutionPage({
  initialContext = null,
  onCreateDefect = () => undefined,
}: TestExecutionPageProps) {
  const [projects] = useState(() => loadProjects());
  const [scenarios] = useState(() => loadScenarios());
  const [testCases] = useState(() => loadTestCases());
  const [executions, setExecutions] = useState<TestExecution[]>(() =>
    loadExecutions(),
  );
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialContext?.projectId ?? '',
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    initialContext?.scenarioId ?? '',
  );
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(
    initialContext?.testCaseId ?? '',
  );
  const [executionMode, setExecutionMode] = useState<ExecutionMode | null>(null);

  const availableScenarios = scenarios.filter(
    (scenario) => scenario.projectId === selectedProjectId,
  );
  const availableTestCases = testCases.filter(
    (testCase) => testCase.scenarioId === selectedScenarioId,
  );
  const selectedTestCase = testCases.find(
    (testCase) => testCase.id === selectedTestCaseId,
  );
  const executionHistory = selectedTestCase
    ? getTestCaseExecutionHistory(executions, selectedTestCase.id)
    : [];

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedScenarioId('');
    setSelectedTestCaseId('');
    setExecutionMode(null);
  }

  function handleScenarioChange(scenarioId: string) {
    setSelectedScenarioId(scenarioId);
    setSelectedTestCaseId('');
    setExecutionMode(null);
  }

  function handleTestCaseChange(testCaseId: string) {
    setSelectedTestCaseId(testCaseId);
    setExecutionMode(null);
  }

  function saveExecution(execution: TestExecution) {
    const nextExecutions = [...executions, execution];

    saveExecutions(nextExecutions);
    setExecutions(nextExecutions);
    setExecutionMode(null);
  }

  function getExecutionRecordBase(
    overallStatus: ExecutionStatus,
    notes: string,
  ) {
    if (!selectedTestCase) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      projectId: selectedTestCase.projectId,
      scenarioId: selectedTestCase.scenarioId,
      testCaseId: selectedTestCase.id,
      overallStatus,
      executionDate: new Date().toISOString(),
      notes,
    };
  }

  function handleSaveDetailedExecution(
    stepResults: StepExecutionResult[],
    notes: string,
    overallStatus: ExecutionStatus,
  ) {
    const base = getExecutionRecordBase(overallStatus, notes);

    if (!base) {
      return;
    }

    saveExecution(createDetailedExecutionRecord({ ...base, stepResults }));
  }

  function handleSaveQuickExecution(
    overallStatus: ExecutionStatus,
    notes: string,
  ) {
    const base = getExecutionRecordBase(overallStatus, notes);

    if (!base) {
      return;
    }

    saveExecution(createQuickExecutionRecord(base));
  }

  return (
    <section aria-label="Test execution">
      <p className="max-w-3xl text-sm leading-6 text-slate-600">
        Select a project, scenario, and test case to record a test execution.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SelectField
          id="execution-project"
          label="Project"
          value={selectedProjectId}
          placeholder="Select a project"
          options={projects.map((project) => ({
            value: project.id,
            label: project.name,
          }))}
          onChange={handleProjectChange}
        />
        <SelectField
          id="execution-scenario"
          label="Test Scenario"
          value={selectedScenarioId}
          placeholder="Select a scenario"
          options={availableScenarios.map((scenario) => ({
            value: scenario.id,
            label: scenario.name,
          }))}
          disabled={!selectedProjectId}
          onChange={handleScenarioChange}
        />
        <SelectField
          id="execution-test-case"
          label="Test Case"
          value={selectedTestCaseId}
          placeholder="Select a test case"
          options={availableTestCases.map((testCase) => ({
            value: testCase.id,
            label: testCase.name,
          }))}
          disabled={!selectedScenarioId}
          onChange={handleTestCaseChange}
        />
      </div>

      <div className="mt-6">
        {projects.length === 0 ? (
          <EmptyState message="No projects are available for execution." />
        ) : !selectedProjectId ? (
          <EmptyState message="Select a project to begin." />
        ) : availableScenarios.length === 0 ? (
          <EmptyState message="This project has no test scenarios." />
        ) : !selectedScenarioId ? (
          <EmptyState message="Select a test scenario to continue." />
        ) : availableTestCases.length === 0 ? (
          <EmptyState message="This scenario has no test cases." />
        ) : !selectedTestCase ? (
          <EmptyState message="Select a test case to view its details." />
        ) : (
          <div className="space-y-6">
            <TestCaseDetails testCase={selectedTestCase} />

            {executionMode === 'quick' ? (
              <QuickRunForm
                key={`${selectedTestCase.id}-${executionHistory.length}-quick`}
                testCase={selectedTestCase}
                onSave={handleSaveQuickExecution}
                onCancel={() => setExecutionMode(null)}
              />
            ) : executionMode === 'detailed' ? (
              <TestCaseExecutionForm
                key={`${selectedTestCase.id}-${executionHistory.length}-detailed`}
                testCase={selectedTestCase}
                onSave={handleSaveDetailedExecution}
                onCancel={() => setExecutionMode(null)}
              />
            ) : (
              <ExecutionModeChooser onSelect={setExecutionMode} />
            )}

            <ExecutionHistory
              key={selectedTestCase.id}
              executions={executionHistory}
              testCase={selectedTestCase}
              initialSelectedExecutionId={initialContext?.executionId}
              onCreateDefect={onCreateDefect}
            />
          </div>
        )}
      </div>
    </section>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

function ExecutionModeChooser({
  onSelect,
}: {
  onSelect: (mode: ExecutionMode) => void;
}) {
  return (
    <section aria-labelledby="execution-mode-title">
      <h3
        id="execution-mode-title"
        className="text-xl font-semibold text-slate-950"
      >
        Choose execution mode
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-950">Quick Run</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Record an overall Test Case result without individual step results.
          </p>
          <button
            type="button"
            className="mt-5 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={() => onSelect('quick')}
          >
            Start Quick Run
          </button>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-950">Detailed Run</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Execute and record results for every Test Step.
          </p>
          <button
            type="button"
            className="mt-5 rounded-md border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={() => onSelect('detailed')}
          >
            Start Detailed Run
          </button>
        </article>
      </div>
    </section>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

function SelectField({
  id,
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="testnest-select mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-slate-950">{message}</p>
    </div>
  );
}

function TestCaseDetails({ testCase }: { testCase: TestCase }) {
  return (
    <section
      aria-labelledby="selected-test-case-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-sm font-medium text-teal-700">Selected Test Case</p>
      <h3
        id="selected-test-case-title"
        className="mt-1 text-xl font-semibold text-slate-950"
      >
        {testCase.name}
      </h3>
      <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-700">Test Description</dt>
          <dd className="mt-1 leading-6 text-slate-950">
            {testCase.description || 'No description'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-700">Precondition</dt>
          <dd className="mt-1 leading-6 text-slate-950">
            {testCase.precondition || 'No precondition'}
          </dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-slate-200 pt-5">
        <h4 className="font-semibold text-slate-950">Test Steps</h4>
        <ol className="mt-3 space-y-3">
          {testCase.steps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-950">
                Step {index + 1}: {step.description}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <span className="font-medium text-slate-700">
                  Expected Result:
                </span>{' '}
                {step.expectedResult}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
