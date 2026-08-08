import { useState } from 'react';
import {
  deleteScenarioExecutions,
  deleteTestCaseExecutions,
  loadExecutions,
} from '../executions/executionStorage';
import {
  EXECUTION_STATUSES,
  getLatestExecutionsByTestCase,
  type ExecutionStatus,
} from '../executions/execution';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ScenarioForm } from '../components/ScenarioForm';
import { TestCaseImportPanel } from '../components/TestCaseImportPanel';
import {
  ScenarioTable,
  type ScenarioSortKey,
} from '../components/ScenarioTable';
import {
  ClearFiltersButton,
  TableFilterSelect,
  TableNoResults,
  TablePagination,
  TableResultCount,
  TableSearchField,
  TableToolbar,
} from '../components/TableControls';
import { TestCaseForm } from '../components/TestCaseForm';
import {
  TestCaseTable,
  type TestCaseSortKey,
} from '../components/TestCaseTable';
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
import {
  createTestCaseExportWorkbook,
  createTestCaseImportTemplate,
  downloadXlsx,
} from '../testCases/testCaseSpreadsheet';
import {
  buildTestCaseExportRows,
  getTestCasesForExport,
} from '../testCases/testCaseTransfer';
import {
  compareDates,
  compareText,
  filterItems,
  getNextSortDirection,
  matchesSearch,
  paginateItems,
  sortItems,
  type SortDirection,
} from '../table/tableUtils';

type FormMode = 'create' | 'edit' | null;

export function TestCasesPage() {
  const [projects] = useState(() => loadProjects());
  const [scenarios, setScenarios] = useState<TestScenario[]>(() =>
    loadScenarios(),
  );
  const [testCases, setTestCases] = useState<TestCase[]>(() =>
    loadTestCases(),
  );
  const [executions] = useState(() => loadExecutions());
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [scenarioFormMode, setScenarioFormMode] = useState<FormMode>(null);
  const [editingScenario, setEditingScenario] =
    useState<TestScenario | null>(null);
  const [scenarioDeleteTarget, setScenarioDeleteTarget] =
    useState<TestScenario | null>(null);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [scenarioSortKey, setScenarioSortKey] =
    useState<ScenarioSortKey>('updatedDate');
  const [scenarioSortDirection, setScenarioSortDirection] =
    useState<SortDirection>('descending');
  const [scenarioPage, setScenarioPage] = useState(1);
  const [testCaseFormMode, setTestCaseFormMode] = useState<FormMode>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [testCaseDeleteTarget, setTestCaseDeleteTarget] =
    useState<TestCase | null>(null);
  const [testCaseSearch, setTestCaseSearch] = useState('');
  const [testCaseStatusFilter, setTestCaseStatusFilter] = useState<
    'all' | ExecutionStatus
  >('all');
  const [testCaseSortKey, setTestCaseSortKey] =
    useState<TestCaseSortKey>('updatedDate');
  const [testCaseSortDirection, setTestCaseSortDirection] =
    useState<SortDirection>('descending');
  const [testCasePage, setTestCasePage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [transferError, setTransferError] = useState('');

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
  const latestExecutions = getLatestExecutionsByTestCase(executions);
  const latestStatuses = new Map<string, ExecutionStatus>(
    [...latestExecutions].map(([testCaseId, execution]) => [
      testCaseId,
      execution.overallStatus,
    ]),
  );
  const filteredScenarios = filterItems(projectScenarios, [
    (scenario) =>
      matchesSearch(scenarioSearch, [scenario.name, scenario.description]),
  ]);
  const sortedScenarios = sortItems(
    filteredScenarios,
    (first, second) => {
      switch (scenarioSortKey) {
        case 'name':
          return compareText(first.name, second.name);
        case 'createdDate':
          return compareDates(first.createdDate, second.createdDate);
        case 'updatedDate':
          return compareDates(first.updatedDate, second.updatedDate);
      }
    },
    scenarioSortDirection,
  );
  const paginatedScenarios = paginateItems(sortedScenarios, scenarioPage);
  const filteredTestCases = filterItems(scenarioTestCases, [
    (testCase) =>
      matchesSearch(testCaseSearch, [
        testCase.name,
        testCase.description,
        testCase.precondition,
      ]),
    (testCase) =>
      testCaseStatusFilter === 'all' ||
      (latestStatuses.get(testCase.id) ?? 'No Run') === testCaseStatusFilter,
  ]);
  const sortedTestCases = sortItems(
    filteredTestCases,
    (first, second) => {
      switch (testCaseSortKey) {
        case 'name':
          return compareText(first.name, second.name);
        case 'createdDate':
          return compareDates(first.createdDate, second.createdDate);
        case 'updatedDate':
          return compareDates(first.updatedDate, second.updatedDate);
      }
    },
    testCaseSortDirection,
  );
  const paginatedTestCases = paginateItems(sortedTestCases, testCasePage);

  function handleScenarioSort(nextSortKey: ScenarioSortKey) {
    setScenarioSortDirection(
      getNextSortDirection(
        scenarioSortKey,
        nextSortKey,
        scenarioSortDirection,
      ),
    );
    setScenarioSortKey(nextSortKey);
    setScenarioPage(1);
  }

  function handleTestCaseSort(nextSortKey: TestCaseSortKey) {
    setTestCaseSortDirection(
      getNextSortDirection(
        testCaseSortKey,
        nextSortKey,
        testCaseSortDirection,
      ),
    );
    setTestCaseSortKey(nextSortKey);
    setTestCasePage(1);
  }

  function clearScenarioFilters() {
    setScenarioSearch('');
    setScenarioSortKey('updatedDate');
    setScenarioSortDirection('descending');
    setScenarioPage(1);
  }

  function clearTestCaseFilters() {
    setTestCaseSearch('');
    setTestCaseStatusFilter('all');
    setTestCaseSortKey('updatedDate');
    setTestCaseSortDirection('descending');
    setTestCasePage(1);
  }

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
    clearScenarioFilters();
    clearTestCaseFilters();
    closeScenarioForm();
    closeTestCaseForm();
  }

  function openScenario(scenario: TestScenario) {
    setSelectedScenarioId(scenario.id);
    clearTestCaseFilters();
    closeScenarioForm();
  }

  function returnToScenarios() {
    setSelectedScenarioId('');
    clearTestCaseFilters();
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

  async function handleDownloadTemplate() {
    setTransferError('');

    try {
      downloadXlsx(
        await createTestCaseImportTemplate(),
        'testnest-test-case-import-template.xlsx',
      );
    } catch {
      setTransferError('The import template could not be generated.');
    }
  }

  async function handleExport(mode: 'all' | 'filtered') {
    setTransferError('');

    try {
      const selectedTestCases = getTestCasesForExport(
        testCases,
        sortedTestCases,
        mode,
      );
      const rows = buildTestCaseExportRows(
        selectedTestCases,
        projects,
        scenarios,
        latestStatuses,
      );
      const workbook = await createTestCaseExportWorkbook(rows);

      downloadXlsx(
        workbook,
        mode === 'all'
          ? 'testnest-test-cases-all.xlsx'
          : 'testnest-test-cases-filtered.xlsx',
      );
    } catch {
      setTransferError('The Test Case export could not be generated.');
    }
  }

  function handleImport(importedTestCases: TestCase[]) {
    if (importedTestCases.length === 0) {
      return;
    }

    const nextTestCases = [...testCases, ...importedTestCases];
    const firstImportedTestCase = importedTestCases[0];

    saveTestCases(nextTestCases);
    setTestCases(nextTestCases);
    setSelectedProjectId(firstImportedTestCase.projectId);
    setSelectedScenarioId(firstImportedTestCase.scenarioId);
    clearScenarioFilters();
    clearTestCaseFilters();
    setIsImporting(false);
    setTransferError('');
    setTransferMessage(
      `${importedTestCases.length} ${
        importedTestCases.length === 1 ? 'Test Case was' : 'Test Cases were'
      } imported.`,
    );
  }

  return (
    <section aria-label="Test scenario and test case management">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Organize test coverage by selecting a project, then opening a test
          scenario.
        </p>
        <div
          className="flex flex-wrap gap-2"
          aria-label="Test Case transfer actions"
        >
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={handleDownloadTemplate}
          >
            Download Import Template
          </button>
          <button
            type="button"
            className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={() => {
              setTransferMessage('');
              setTransferError('');
              closeScenarioForm();
              closeTestCaseForm();
              setIsImporting(true);
            }}
          >
            Import Test Cases
          </button>
          <button
            type="button"
            disabled={testCases.length === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={() => handleExport('all')}
          >
            Export All
          </button>
          <button
            type="button"
            disabled={!selectedScenario || sortedTestCases.length === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={() => handleExport('filtered')}
          >
            Export Filtered
          </button>
        </div>
      </div>

      {transferMessage ? (
        <p
          role="status"
          className="mt-4 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {transferMessage}
        </p>
      ) : null}
      {transferError ? (
        <p
          role="alert"
          className="mt-4 border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
        >
          {transferError}
        </p>
      ) : null}

      {isImporting ? (
        <div className="mt-6">
          <TestCaseImportPanel
            projects={projects}
            scenarios={scenarios}
            existingTestCases={testCases}
            onImport={handleImport}
            onCancel={() => setIsImporting(false)}
          />
        </div>
      ) : null}

      <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div>
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
        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="test-case-scenario"
          >
            Test Scenario
          </label>
          <select
            id="test-case-scenario"
            className="testnest-select mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            value={selectedScenarioId}
            disabled={!selectedProjectId}
            onChange={(event) => {
              const scenario = scenarios.find(
                (candidate) => candidate.id === event.target.value,
              );

              if (scenario) {
                openScenario(scenario);
              } else {
                returnToScenarios();
              }
            }}
          >
            <option value="">All scenarios</option>
            {projectScenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>
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
                  <TableToolbar>
                    <TableSearchField
                      id="test-case-search"
                      label="Search test cases"
                      placeholder="Search name, description, or precondition"
                      value={testCaseSearch}
                      onChange={(value) => {
                        setTestCaseSearch(value);
                        setTestCasePage(1);
                      }}
                    />
                    <TableFilterSelect
                      id="test-case-status-filter"
                      label="Filter by Latest Status"
                      value={testCaseStatusFilter}
                      options={[
                        { value: 'all', label: 'All Statuses' },
                        ...EXECUTION_STATUSES.map((status) => ({
                          value: status,
                          label: status,
                        })),
                      ]}
                      onChange={(value) => {
                        setTestCaseStatusFilter(
                          value as 'all' | ExecutionStatus,
                        );
                        setTestCasePage(1);
                      }}
                    />
                    <ClearFiltersButton onClick={clearTestCaseFilters} />
                  </TableToolbar>
                  <div className="my-3">
                    <TableResultCount count={filteredTestCases.length} />
                  </div>
                  {filteredTestCases.length > 0 ? (
                    <>
                      <TestCaseTable
                        testCases={paginatedTestCases.items}
                        latestStatuses={latestStatuses}
                        sortKey={testCaseSortKey}
                        sortDirection={testCaseSortDirection}
                        onSort={handleTestCaseSort}
                        onEdit={(testCase) => {
                          setEditingTestCase(testCase);
                          setTestCaseFormMode('edit');
                        }}
                        onRequestDelete={setTestCaseDeleteTarget}
                      />
                      <TablePagination
                        page={paginatedTestCases.page}
                        totalPages={paginatedTestCases.totalPages}
                        onPageChange={setTestCasePage}
                      />
                    </>
                  ) : (
                    <TableNoResults
                      itemName="test cases"
                      onClear={clearTestCaseFilters}
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
                  <TableToolbar>
                    <TableSearchField
                      id="scenario-search"
                      label="Search scenarios"
                      placeholder="Search name or description"
                      value={scenarioSearch}
                      onChange={(value) => {
                        setScenarioSearch(value);
                        setScenarioPage(1);
                      }}
                    />
                    <ClearFiltersButton onClick={clearScenarioFilters} />
                  </TableToolbar>
                  <div className="my-3">
                    <TableResultCount count={filteredScenarios.length} />
                  </div>
                  {filteredScenarios.length > 0 ? (
                    <>
                      <ScenarioTable
                        scenarios={paginatedScenarios.items}
                        sortKey={scenarioSortKey}
                        sortDirection={scenarioSortDirection}
                        onSort={handleScenarioSort}
                        onOpen={openScenario}
                        onEdit={(scenario) => {
                          setEditingScenario(scenario);
                          setScenarioFormMode('edit');
                        }}
                        onRequestDelete={setScenarioDeleteTarget}
                      />
                      <TablePagination
                        page={paginatedScenarios.page}
                        totalPages={paginatedScenarios.totalPages}
                        onPageChange={setScenarioPage}
                      />
                    </>
                  ) : (
                    <TableNoResults
                      itemName="scenarios"
                      onClear={clearScenarioFilters}
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
