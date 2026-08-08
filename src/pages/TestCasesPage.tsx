import { useState } from 'react';
import {
  deleteScenarioExecutions,
  deleteTestCaseExecutions,
} from '../executions/executionStorage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ScenarioForm } from '../components/ScenarioForm';
import { ScenarioTable } from '../components/ScenarioTable';
import { TestCaseForm } from '../components/TestCaseForm';
import { TestCaseTable } from '../components/TestCaseTable';
import { loadProjects } from '../projects/projectStorage';
import {
  getScenarioNameError,
  getTestCaseNameError,
  getTestStepErrors,
  normalizeScenarioValues,
  normalizeTestCaseValues,
  type ScenarioFormValues,
  type TestCase,
  type TestCaseFormErrors,
  type TestCaseFormValues,
  type TestScenario,
} from '../testCases/testCase';
import {
  deleteScenarioTestCases,
  loadScenarios,
  loadTestCases,
  saveScenarios,
  saveTestCases,
} from '../testCases/testCaseStorage';

type FormMode = 'create' | 'edit' | null;

export function TestCasesPage() {
  const [projects] = useState(() => loadProjects());
  const [scenarios, setScenarios] = useState<TestScenario[]>(() =>
    loadScenarios(),
  );
  const [testCases, setTestCases] = useState<TestCase[]>(() =>
    loadTestCases(),
  );
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [scenarioFormMode, setScenarioFormMode] = useState<FormMode>(null);
  const [editingScenario, setEditingScenario] =
    useState<TestScenario | null>(null);
  const [scenarioDeleteTarget, setScenarioDeleteTarget] =
    useState<TestScenario | null>(null);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [testCaseFormMode, setTestCaseFormMode] = useState<FormMode>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [testCaseDeleteTarget, setTestCaseDeleteTarget] =
    useState<TestCase | null>(null);
  const [testCaseSearch, setTestCaseSearch] = useState('');

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );
  const selectedScenario = scenarios.find(
    (scenario) => scenario.id === selectedScenarioId,
  );
  const projectScenarios = scenarios.filter(
    (scenario) => scenario.projectId === selectedProjectId,
  );
  const scenarioTestCases = testCases.filter(
    (testCase) => testCase.scenarioId === selectedScenarioId,
  );
  const comparableScenarioSearch = scenarioSearch.trim().toLocaleLowerCase();
  const comparableTestCaseSearch = testCaseSearch.trim().toLocaleLowerCase();
  const filteredScenarios = projectScenarios.filter((scenario) =>
    scenario.name.toLocaleLowerCase().includes(comparableScenarioSearch),
  );
  const filteredTestCases = scenarioTestCases.filter((testCase) =>
    testCase.name.toLocaleLowerCase().includes(comparableTestCaseSearch),
  );

  function closeScenarioForm() {
    setScenarioFormMode(null);
    setEditingScenario(null);
  }

  function closeTestCaseForm() {
    setTestCaseFormMode(null);
    setEditingTestCase(null);
  }

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedScenarioId('');
    setScenarioSearch('');
    setTestCaseSearch('');
    closeScenarioForm();
    closeTestCaseForm();
  }

  function openScenario(scenario: TestScenario) {
    setSelectedScenarioId(scenario.id);
    setTestCaseSearch('');
    closeScenarioForm();
  }

  function returnToScenarios() {
    setSelectedScenarioId('');
    setTestCaseSearch('');
    closeTestCaseForm();
  }

  function handleScenarioSubmit(values: ScenarioFormValues) {
    if (!selectedProject) {
      return 'Select a project before creating a scenario.';
    }

    const nameError = getScenarioNameError(
      values.name,
      scenarios,
      selectedProject.id,
      editingScenario?.id,
    );

    if (nameError) {
      return nameError;
    }

    const now = new Date().toISOString();
    const normalizedValues = normalizeScenarioValues(values);
    const nextScenarios = editingScenario
      ? scenarios.map((scenario) =>
          scenario.id === editingScenario.id
            ? { ...scenario, ...normalizedValues, updatedDate: now }
            : scenario,
        )
      : [
          ...scenarios,
          {
            id: crypto.randomUUID(),
            ...normalizedValues,
            projectId: selectedProject.id,
            createdDate: now,
            updatedDate: now,
          },
        ];

    saveScenarios(nextScenarios);
    setScenarios(nextScenarios);
    closeScenarioForm();

    return null;
  }

  function handleScenarioDelete() {
    if (!scenarioDeleteTarget) {
      return;
    }

    const nextScenarios = scenarios.filter(
      (scenario) => scenario.id !== scenarioDeleteTarget.id,
    );
    const nextTestCases = testCases.filter(
      (testCase) => testCase.scenarioId !== scenarioDeleteTarget.id,
    );

    saveScenarios(nextScenarios);
    deleteScenarioTestCases(scenarioDeleteTarget.id);
    deleteScenarioExecutions(scenarioDeleteTarget.id);
    setScenarios(nextScenarios);
    setTestCases(nextTestCases);
    setScenarioDeleteTarget(null);
  }

  function handleTestCaseSubmit(
    values: TestCaseFormValues,
  ): TestCaseFormErrors | null {
    if (!selectedProject || !selectedScenario) {
      return {
        nameError: 'Select a scenario before creating a test case.',
        stepErrors: [],
      };
    }

    const nameError = getTestCaseNameError(
      values.name,
      testCases,
      selectedScenario.id,
      editingTestCase?.id,
    );
    const stepErrors = getTestStepErrors(values.steps);

    if (nameError || stepErrors.length > 0) {
      return { nameError, stepErrors };
    }

    const now = new Date().toISOString();
    const normalizedValues = normalizeTestCaseValues(values);
    const nextTestCases = editingTestCase
      ? testCases.map((testCase) =>
          testCase.id === editingTestCase.id
            ? { ...testCase, ...normalizedValues, updatedDate: now }
            : testCase,
        )
      : [
          ...testCases,
          {
            id: crypto.randomUUID(),
            ...normalizedValues,
            scenarioId: selectedScenario.id,
            projectId: selectedProject.id,
            createdDate: now,
            updatedDate: now,
          },
        ];

    saveTestCases(nextTestCases);
    setTestCases(nextTestCases);
    closeTestCaseForm();

    return null;
  }

  function handleTestCaseDelete() {
    if (!testCaseDeleteTarget) {
      return;
    }

    const nextTestCases = testCases.filter(
      (testCase) => testCase.id !== testCaseDeleteTarget.id,
    );

    saveTestCases(nextTestCases);
    deleteTestCaseExecutions(testCaseDeleteTarget.id);
    setTestCases(nextTestCases);
    setTestCaseDeleteTarget(null);
  }

  return (
    <section aria-label="Test scenario and test case management">
      <p className="max-w-3xl text-sm leading-6 text-slate-600">
        Organize test coverage by selecting a project, then opening a test
        scenario.
      </p>

      <div className="mt-5 max-w-md">
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="test-case-project"
        >
          Project
        </label>
        <select
          id="test-case-project"
          className="testnest-select mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          value={selectedProjectId}
          onChange={(event) => handleProjectChange(event.target.value)}
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Test case context" className="mt-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <li>
            <button
              type="button"
              className="font-semibold text-teal-700 hover:text-teal-900"
              onClick={() => handleProjectChange('')}
            >
              Test Cases
            </button>
          </li>
          {selectedProject ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                {selectedScenario ? (
                  <button
                    type="button"
                    aria-label={`Back to ${selectedProject.name} scenarios`}
                    className="font-semibold text-teal-700 hover:text-teal-900"
                    onClick={returnToScenarios}
                  >
                    {selectedProject.name}
                  </button>
                ) : (
                  <span aria-current="page" className="font-medium text-slate-900">
                    {selectedProject.name}
                  </span>
                )}
              </li>
            </>
          ) : null}
          {selectedScenario ? (
            <>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-slate-900">
                {selectedScenario.name}
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      <div className="mt-6">
        {projects.length === 0 ? (
          <EmptyState
            title="No projects available"
            description="Create a project before adding test scenarios and test cases."
          />
        ) : !selectedProject ? (
          <EmptyState
            title="Select a project"
            description="Choose a project to view and manage its test scenarios."
          />
        ) : selectedScenario ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-teal-700">Test Cases</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedScenario.name}
                </h3>
              </div>
              {testCaseFormMode || scenarioTestCases.length === 0 ? null : (
                <button
                  type="button"
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  onClick={() => {
                    setEditingTestCase(null);
                    setTestCaseFormMode('create');
                  }}
                >
                  Create Test Case
                </button>
              )}
            </div>

            <div className="mt-5">
              {testCaseFormMode ? (
                <TestCaseForm
                  key={editingTestCase?.id ?? 'new-test-case'}
                  testCase={editingTestCase ?? undefined}
                  onSubmit={handleTestCaseSubmit}
                  onCancel={closeTestCaseForm}
                />
              ) : scenarioTestCases.length === 0 ? (
                <EmptyState
                  title="No test cases yet"
                  description="Create the first test case for this scenario."
                  actionLabel="Create Test Case"
                  onAction={() => {
                    setEditingTestCase(null);
                    setTestCaseFormMode('create');
                  }}
                />
              ) : (
                <>
                  <SearchField
                    id="test-case-search"
                    label="Search test cases"
                    placeholder="Search by test case name"
                    value={testCaseSearch}
                    onChange={setTestCaseSearch}
                  />
                  {filteredTestCases.length > 0 ? (
                    <TestCaseTable
                      testCases={filteredTestCases}
                      onEdit={(testCase) => {
                        setEditingTestCase(testCase);
                        setTestCaseFormMode('edit');
                      }}
                      onRequestDelete={setTestCaseDeleteTarget}
                    />
                  ) : (
                    <SearchEmptyState
                      itemName="test cases"
                      onClear={() => setTestCaseSearch('')}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-teal-700">
                  {selectedProject.name}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  Test Scenarios
                </h3>
              </div>
              {scenarioFormMode || projectScenarios.length === 0 ? null : (
                <button
                  type="button"
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  onClick={() => {
                    setEditingScenario(null);
                    setScenarioFormMode('create');
                  }}
                >
                  Create Scenario
                </button>
              )}
            </div>

            <div className="mt-5">
              {scenarioFormMode ? (
                <ScenarioForm
                  key={editingScenario?.id ?? 'new-scenario'}
                  scenario={editingScenario ?? undefined}
                  onSubmit={handleScenarioSubmit}
                  onCancel={closeScenarioForm}
                />
              ) : projectScenarios.length === 0 ? (
                <EmptyState
                  title="No scenarios yet"
                  description="Create the first test scenario for this project."
                  actionLabel="Create Scenario"
                  onAction={() => {
                    setEditingScenario(null);
                    setScenarioFormMode('create');
                  }}
                />
              ) : (
                <>
                  <SearchField
                    id="scenario-search"
                    label="Search scenarios"
                    placeholder="Search by scenario name"
                    value={scenarioSearch}
                    onChange={setScenarioSearch}
                  />
                  {filteredScenarios.length > 0 ? (
                    <ScenarioTable
                      scenarios={filteredScenarios}
                      onOpen={openScenario}
                      onEdit={(scenario) => {
                        setEditingScenario(scenario);
                        setScenarioFormMode('edit');
                      }}
                      onRequestDelete={setScenarioDeleteTarget}
                    />
                  ) : (
                    <SearchEmptyState
                      itemName="scenarios"
                      onClear={() => setScenarioSearch('')}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {scenarioDeleteTarget ? (
        <ConfirmDialog
          title="Delete scenario?"
          description={`Delete "${scenarioDeleteTarget.name}"? Its test cases will also be deleted.`}
          confirmLabel="Delete Scenario"
          onCancel={() => setScenarioDeleteTarget(null)}
          onConfirm={handleScenarioDelete}
        />
      ) : null}

      {testCaseDeleteTarget ? (
        <ConfirmDialog
          title="Delete test case?"
          description={`Delete "${testCaseDeleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete Test Case"
          onCancel={() => setTestCaseDeleteTarget(null)}
          onConfirm={handleTestCaseDelete}
        />
      ) : null}
    </section>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="mt-5 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

type SearchFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: SearchFieldProps) {
  return (
    <div className="mb-4 max-w-md">
      <label className="block text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type SearchEmptyStateProps = {
  itemName: string;
  onClear: () => void;
};

function SearchEmptyState({ itemName, onClear }: SearchEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-slate-950">
        No {itemName} match your search.
      </p>
      <button
        type="button"
        className="mt-3 text-sm font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900"
        onClick={onClear}
      >
        Clear search
      </button>
    </div>
  );
}
