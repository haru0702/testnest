import { useState, type ReactNode } from 'react';
import { DistributionChart } from '../components/DistributionChart';
import { StatCard } from '../components/StatCard';
import {
  ClearFiltersButton,
  SortableTableHeader,
  TableNoResults,
  TablePagination,
  TableResultCount,
  TableSearchField,
  TableToolbar,
} from '../components/TableControls';
import {
  DEFECT_PRIORITIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
} from '../defects/defect';
import { loadDefects } from '../defects/defectStorage';
import { EXECUTION_STATUSES } from '../executions/execution';
import { loadExecutions } from '../executions/executionStorage';
import { loadProjects } from '../projects/projectStorage';
import {
  buildReportExportRows,
  EMPTY_REPORT_FILTERS,
  EMPTY_TRACEABILITY_FILTERS,
  filterReportData,
  getAttentionRows,
  getDateRangeError,
  getDefectSummary,
  getDefectsByPriority,
  getDefectsByProject,
  getDefectsBySeverity,
  getDefectsByStatus,
  getExecutionByProject,
  getExecutionByScenario,
  getExecutionSummary,
  getTraceabilityRows,
  type CategoryCountRow,
  type ReportExportRow,
  type ReportFilters,
  type ReportKey,
  type TraceabilityFilters,
} from '../reports/report';
import { createReportWorkbook } from '../reports/reportSpreadsheet';
import {
  compareText,
  getNextSortDirection,
  matchesSearch,
  paginateItems,
  sortItems,
  type SortDirection,
} from '../table/tableUtils';
import { downloadXlsx } from '../testCases/testCaseSpreadsheet';
import { loadScenarios, loadTestCases } from '../testCases/testCaseStorage';

const REPORT_TABS: { id: ReportKey; label: string }[] = [
  { id: 'executionSummary', label: 'Test Execution Summary' },
  { id: 'executionByProject', label: 'Test Execution by Project' },
  { id: 'executionByScenario', label: 'Test Execution by Scenario' },
  { id: 'defectSummary', label: 'Defect Summary' },
  { id: 'defectsByProject', label: 'Defects by Project' },
  { id: 'defectsBySeverity', label: 'Defects by Severity' },
  { id: 'defectsByPriority', label: 'Defects by Priority' },
  { id: 'defectsByStatus', label: 'Defects by Status' },
  { id: 'traceability', label: 'Traceability Report' },
  { id: 'attention', label: 'Attention Needed Report' },
];

type ReportsPageProps = {
  initialReport?: ReportKey;
  initialFilters?: Partial<ReportFilters>;
};

export function ReportsPage({
  initialReport = 'executionSummary',
  initialFilters = {},
}: ReportsPageProps) {
  const [projects] = useState(() => loadProjects());
  const [scenarios] = useState(() => loadScenarios());
  const [testCases] = useState(() => loadTestCases());
  const [executions] = useState(() => loadExecutions());
  const [defects] = useState(() => loadDefects());
  const [activeReport, setActiveReport] = useState<ReportKey>(initialReport);
  const initialFilterValues = { ...EMPTY_REPORT_FILTERS, ...initialFilters };
  const [draftFilters, setDraftFilters] =
    useState<ReportFilters>(initialFilterValues);
  const [appliedFilters, setAppliedFilters] =
    useState<ReportFilters>(initialFilterValues);
  const [dateError, setDateError] = useState<string | null>(null);
  const [traceabilityFilters, setTraceabilityFilters] =
    useState<TraceabilityFilters>({ ...EMPTY_TRACEABILITY_FILTERS });
  const [exportError, setExportError] = useState('');

  const data = { projects, scenarios, testCases, executions, defects };
  const filteredData = filterReportData(data, appliedFilters);
  const executionSummary = getExecutionSummary(
    filteredData.testCases,
    filteredData.executions,
  );
  const defectSummary = getDefectSummary(filteredData.defects);
  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([key, value]) =>
      key === 'fromDate' || key === 'toDate' ? Boolean(value) : value !== 'all',
  ).length;
  const availableScenarios = scenarios.filter(
    (scenario) =>
      draftFilters.projectId === 'all' ||
      scenario.projectId === draftFilters.projectId,
  );

  function updateDraft<Key extends keyof ReportFilters>(
    key: Key,
    value: ReportFilters[Key],
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'projectId' ? { scenarioId: 'all' } : {}),
    }));
    setDateError(null);
  }

  function applyFilters() {
    const validationError = getDateRangeError(draftFilters);
    setDateError(validationError);

    if (!validationError) {
      setAppliedFilters(draftFilters);
    }
  }

  function clearFilters() {
    setDraftFilters({ ...EMPTY_REPORT_FILTERS });
    setAppliedFilters({ ...EMPTY_REPORT_FILTERS });
    setTraceabilityFilters({ ...EMPTY_TRACEABILITY_FILTERS });
    setDateError(null);
  }

  async function exportRows(
    reportName: string,
    rows: readonly ReportExportRow[],
  ) {
    setExportError('');

    try {
      const workbook = await createReportWorkbook(reportName, rows);
      const fileName = `testnest-${reportName
        .toLocaleLowerCase()
        .replaceAll(' ', '-')}.xlsx`;
      downloadXlsx(workbook, fileName);
    } catch {
      setExportError('The report could not be exported.');
    }
  }

  function exportActiveSummary() {
    const report = REPORT_TABS.find((item) => item.id === activeReport)!;
    return exportRows(
      report.label,
      buildReportExportRows(
        activeReport,
        filteredData,
        traceabilityFilters,
      ),
    );
  }

  return (
    <section aria-label="QA reports" className="space-y-6">
      <p className="max-w-3xl text-sm leading-6 text-slate-600">
        Explore execution progress, defect risk, traceability, and records that
        need attention using the data saved in TestNest.
      </p>

      <section
        aria-labelledby="report-filters-title"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="report-filters-title" className="text-lg font-semibold text-slate-950">
            Report Filters
          </h3>
          <p
            aria-label={`Active report filters: ${activeFilterCount}`}
            className={`text-sm font-medium ${activeFilterCount ? 'text-teal-700' : 'text-slate-500'}`}
          >
            {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect id="report-project" label="Project" value={draftFilters.projectId} options={[['all', 'All Projects'], ...projects.map((project) => [project.id, project.name] as const)]} onChange={(value) => updateDraft('projectId', value)} />
          <FilterSelect id="report-scenario" label="Test Scenario" value={draftFilters.scenarioId} options={[['all', 'All Scenarios'], ...availableScenarios.map((scenario) => [scenario.id, scenario.name] as const)]} onChange={(value) => updateDraft('scenarioId', value)} />
          <FilterSelect id="report-execution-status" label="Execution Status" value={draftFilters.executionStatus} options={[['all', 'All Execution Statuses'], ...EXECUTION_STATUSES.map((status) => [status, status] as const)]} onChange={(value) => updateDraft('executionStatus', value as ReportFilters['executionStatus'])} />
          <FilterSelect id="report-defect-status" label="Defect Status" value={draftFilters.defectStatus} options={[['all', 'All Defect Statuses'], ...DEFECT_STATUSES.map((status) => [status, status] as const)]} onChange={(value) => updateDraft('defectStatus', value as ReportFilters['defectStatus'])} />
          <FilterSelect id="report-severity" label="Severity" value={draftFilters.severity} options={[['all', 'All Severities'], ...DEFECT_SEVERITIES.map((severity) => [severity, severity] as const)]} onChange={(value) => updateDraft('severity', value as ReportFilters['severity'])} />
          <FilterSelect id="report-priority" label="Priority" value={draftFilters.priority} options={[['all', 'All Priorities'], ...DEFECT_PRIORITIES.map((priority) => [priority, priority] as const)]} onChange={(value) => updateDraft('priority', value as ReportFilters['priority'])} />
          <DateField id="report-from-date" label="From Date" value={draftFilters.fromDate} invalid={Boolean(dateError)} onChange={(value) => updateDraft('fromDate', value)} />
          <DateField id="report-to-date" label="To Date" value={draftFilters.toDate} invalid={Boolean(dateError)} onChange={(value) => updateDraft('toDate', value)} />
        </div>
        {dateError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
            {dateError}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          <button type="button" className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={applyFilters}>
            Apply Filters
          </button>
          <ClearFiltersButton onClick={clearFilters} />
        </div>
      </section>

      <p className="text-sm text-slate-600" aria-live="polite">
        Matching data: {filteredData.testCases.length} Test Cases,{' '}
        {filteredData.executions.length} executions, and {filteredData.defects.length}{' '}
        defects.
      </p>

      <div role="tablist" aria-label="Report sections" className="flex flex-wrap gap-2 border-b border-slate-300 pb-3">
        {REPORT_TABS.map((report) => (
          <button
            key={report.id}
            type="button"
            role="tab"
            aria-selected={activeReport === report.id}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
              activeReport === report.id
                ? 'bg-slate-950 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => {
              setActiveReport(report.id);
              setExportError('');
            }}
          >
            {report.label}
          </button>
        ))}
      </div>

      {exportError ? <p role="alert" className="text-sm font-medium text-rose-700">{exportError}</p> : null}

      <div role="tabpanel" aria-label={REPORT_TABS.find((report) => report.id === activeReport)?.label}>
        {activeReport === 'executionSummary' ? (
          <ExecutionSummaryReport summary={executionSummary} onExport={exportActiveSummary} />
        ) : null}
        {activeReport === 'executionByProject' ? (
          <ExecutionByProjectReport rows={getExecutionByProject(filteredData)} onExport={exportRows} />
        ) : null}
        {activeReport === 'executionByScenario' ? (
          <ExecutionTableReport title="Test Execution by Scenario" rows={getExecutionByScenario(filteredData).map((row) => ({
            id: row.id,
            searchText: `${row.project} ${row.scenario}`,
            values: {
              project: row.project,
              scenario: row.scenario ?? '',
              total: row.totalTestCases,
              passed: row.Passed,
              failed: row.Failed,
              blocked: row.Blocked,
              noRun: row['No Run'],
              execution: row.executionPercentage,
            },
          }))} includeScenario onExport={exportRows} />
        ) : null}
        {activeReport === 'defectSummary' ? (
          <DefectSummaryReport summary={defectSummary} rows={getDefectsByStatus(filteredData.defects)} onExport={exportActiveSummary} />
        ) : null}
        {activeReport === 'defectsByProject' ? (
          <DefectsByProjectReport rows={getDefectsByProject(filteredData.projects, filteredData.defects)} onExport={exportRows} />
        ) : null}
        {activeReport === 'defectsBySeverity' ? (
          <CategoryReport title="Defects by Severity" categoryLabel="Severity" rows={getDefectsBySeverity(filteredData.defects)} onExport={exportRows} />
        ) : null}
        {activeReport === 'defectsByPriority' ? (
          <CategoryReport title="Defects by Priority" categoryLabel="Priority" rows={getDefectsByPriority(filteredData.defects)} onExport={exportRows} />
        ) : null}
        {activeReport === 'defectsByStatus' ? (
          <CategoryReport title="Defects by Status" categoryLabel="Status" rows={getDefectsByStatus(filteredData.defects)} onExport={exportRows} />
        ) : null}
        {activeReport === 'traceability' ? (
          <TraceabilityReport
            rows={getTraceabilityRows(filteredData, traceabilityFilters)}
            filters={traceabilityFilters}
            onFilterChange={setTraceabilityFilters}
            onExport={exportRows}
          />
        ) : null}
        {activeReport === 'attention' ? (
          <AttentionReport rows={getAttentionRows(filteredData)} onExport={exportRows} />
        ) : null}
      </div>
    </section>
  );
}

function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>{label}</label>
      <select id={id} className="testnest-select mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

function DateField({ id, label, value, invalid, onChange }: { id: string; label: string; value: string; invalid: boolean; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>{label}</label>
      <input id={id} type="date" className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={value} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ReportHeader({ title, description, onExport }: { title: string; description: string; onExport: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <button type="button" className="rounded-md border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={onExport}>
        Export Report
      </button>
    </div>
  );
}

function ExecutionSummaryReport({ summary, onExport }: { summary: ReturnType<typeof getExecutionSummary>; onExport: () => void }) {
  return (
    <section aria-label="Test Execution Summary report" className="space-y-5">
      <ReportHeader title="Test Execution Summary" description="Latest execution status and completion across matching Test Cases." onExport={onExport} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Test Cases" value={summary.totalTestCases} tone="neutral" />
        <StatCard label="Passed" value={summary.counts.Passed} tone="success" />
        <StatCard label="Failed" value={summary.counts.Failed} tone="danger" />
        <StatCard label="Blocked" value={summary.counts.Blocked} tone="warning" />
        <StatCard label="No Run" value={summary.counts['No Run']} tone="muted" />
        <StatCard label="Executed Test Cases" value={summary.executedTestCases} tone="neutral" />
      </div>
      <p aria-label={`Execution Completion: ${summary.completionPercentage}%`} className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-900">
        Execution Completion: {summary.completionPercentage}%
      </p>
      <DistributionChart id="report-execution-summary-chart" title="Execution Status" emptyMessage="No matching Test Cases." items={[
        { label: 'Passed', count: summary.counts.Passed, percentage: summary.percentages.Passed, tone: 'success' },
        { label: 'Failed', count: summary.counts.Failed, percentage: summary.percentages.Failed, tone: 'danger' },
        { label: 'Blocked', count: summary.counts.Blocked, percentage: summary.percentages.Blocked, tone: 'warning' },
        { label: 'No Run', count: summary.counts['No Run'], percentage: summary.percentages['No Run'], tone: 'muted' },
      ]} />
    </section>
  );
}

function ExecutionByProjectReport({ rows, onExport }: { rows: ReturnType<typeof getExecutionByProject>; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  const displayRows = rows.map((row) => ({ id: row.id, searchText: row.project, values: { project: row.project, total: row.totalTestCases, passed: row.Passed, failed: row.Failed, blocked: row.Blocked, noRun: row['No Run'], execution: row.executionPercentage } }));
  return (
    <div className="space-y-5">
      <ProjectExecutionChart rows={rows} />
      <ExecutionTableReport title="Test Execution by Project" rows={displayRows} onExport={onExport} />
    </div>
  );
}

function ProjectExecutionChart({ rows }: { rows: ReturnType<typeof getExecutionByProject> }) {
  return (
    <section aria-labelledby="project-execution-chart-title" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 id="project-execution-chart-title" className="text-lg font-semibold text-slate-950">Execution Status by Project</h3>
      {rows.length === 0 ? <p className="mt-4 text-sm text-slate-600">No matching Projects.</p> : (
        <ul className="mt-4 space-y-4">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{row.project}</span><span>{row.executionPercentage}% executed</span></div>
              <div className="mt-2 flex h-3 overflow-hidden rounded-sm bg-slate-100" role="img" aria-label={`${row.project}: ${row.Passed} Passed, ${row.Failed} Failed, ${row.Blocked} Blocked, ${row['No Run']} No Run`}>
                {(['Passed', 'Failed', 'Blocked', 'No Run'] as const).map((status) => {
                  const colors = { Passed: 'bg-emerald-500', Failed: 'bg-rose-500', Blocked: 'bg-amber-500', 'No Run': 'bg-slate-400' };
                  const width = row.totalTestCases ? (row[status] / row.totalTestCases) * 100 : 0;
                  return <span key={status} className={colors[status]} style={{ width: `${width}%` }} />;
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type DisplayRow = { id: string; searchText: string; values: Record<string, string | number> };
type DisplayColumn = { key: string; label: string; suffix?: string };

const executionColumns: DisplayColumn[] = [
  { key: 'project', label: 'Project' },
  { key: 'total', label: 'Total Test Cases' },
  { key: 'passed', label: 'Passed' },
  { key: 'failed', label: 'Failed' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'noRun', label: 'No Run' },
  { key: 'execution', label: 'Execution %', suffix: '%' },
];

function ExecutionTableReport({ title, rows, includeScenario = false, onExport }: { title: string; rows: DisplayRow[]; includeScenario?: boolean; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  const columns = includeScenario ? [executionColumns[0], { key: 'scenario', label: 'Scenario' }, ...executionColumns.slice(1)] : executionColumns;
  return <ReportDataTable title={title} description="Latest execution outcomes for each matching context." rows={rows} columns={columns} onExport={onExport} />;
}

function DefectSummaryReport({ summary, rows, onExport }: { summary: ReturnType<typeof getDefectSummary>; rows: CategoryCountRow[]; onExport: () => void }) {
  return (
    <section aria-label="Defect Summary report" className="space-y-5">
      <ReportHeader title="Defect Summary" description="Current defect workflow status and risk levels." onExport={onExport} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Total Defects" value={summary.total} tone="neutral" />
        <StatCard label="Open" value={summary.statuses.Open} tone="danger" />
        <StatCard label="In Progress" value={summary.statuses['In Progress']} tone="neutral" />
        <StatCard label="Ready for Retest" value={summary.statuses['Ready for Retest']} tone="warning" />
        <StatCard label="Closed" value={summary.statuses.Closed} tone="success" />
        <StatCard label="Reopened" value={summary.statuses.Reopened} tone="warning" />
        <StatCard label="Critical" value={summary.severities.Critical} tone="danger" />
        <StatCard label="High" value={summary.severities.High} tone="warning" />
      </div>
      <DistributionChart id="report-defect-summary-chart" title="Defect Status" emptyMessage="No matching Defects." items={rows.map((row) => ({ label: row.category, count: row.count, percentage: row.percentage, tone: row.category === 'Closed' ? 'success' : row.category === 'Open' ? 'danger' : row.category === 'Ready for Retest' ? 'warning' : 'neutral' }))} />
    </section>
  );
}

function DefectsByProjectReport({ rows, onExport }: { rows: ReturnType<typeof getDefectsByProject>; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  return <ReportDataTable title="Defects by Project" description="Defect volume, workflow, and severity for each matching Project." rows={rows.map((row) => ({ id: row.id, searchText: row.project, values: { project: row.project, total: row.total, open: row.Open, inProgress: row['In Progress'], ready: row['Ready for Retest'], closed: row.Closed, reopened: row.Reopened, critical: row.Critical, high: row.High } }))} columns={[
    { key: 'project', label: 'Project' }, { key: 'total', label: 'Total' }, { key: 'open', label: 'Open' }, { key: 'inProgress', label: 'In Progress' }, { key: 'ready', label: 'Ready for Retest' }, { key: 'closed', label: 'Closed' }, { key: 'reopened', label: 'Reopened' }, { key: 'critical', label: 'Critical' }, { key: 'high', label: 'High' },
  ]} onExport={onExport} />;
}

function CategoryReport({ title, categoryLabel, rows, onExport }: { title: string; categoryLabel: string; rows: CategoryCountRow[]; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  return (
    <div className="space-y-5">
      <DistributionChart id={`${title.toLocaleLowerCase().replaceAll(' ', '-')}-chart`} title={title} emptyMessage="No matching Defects." items={rows.map((row, index) => ({ label: row.category, count: row.count, percentage: row.percentage, tone: (['danger', 'warning', 'neutral', 'muted', 'success'][index] ?? 'neutral') as 'danger' | 'warning' | 'neutral' | 'muted' | 'success' }))} />
      <ReportDataTable title={title} description={`Matching Defects grouped by ${categoryLabel.toLocaleLowerCase()}.`} rows={rows.map((row) => ({ id: row.category, searchText: row.category, values: { category: row.category, count: row.count, percentage: row.percentage } }))} columns={[{ key: 'category', label: categoryLabel }, { key: 'count', label: 'Count' }, { key: 'percentage', label: 'Percentage', suffix: '%' }]} onExport={onExport} />
    </div>
  );
}

function TraceabilityReport({ rows, filters, onFilterChange, onExport }: { rows: ReturnType<typeof getTraceabilityRows>; filters: TraceabilityFilters; onFilterChange: (filters: TraceabilityFilters) => void; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  const displayRows = rows.map((row) => ({ id: row.id, searchText: Object.values(row).join(' '), values: { project: row.project, scenario: row.scenario, testCase: row.testCase, latestStatus: row.latestStatus, execution: row.latestExecution, executionDate: row.latestExecutionDate ? new Date(row.latestExecutionDate).toLocaleString() : 'Not executed', defectId: row.defectId || 'No Defect', defectStatus: row.defectStatus || 'Not applicable', severity: row.severity || 'Not applicable', externalSystem: row.externalSystem || 'Not linked', externalKey: row.externalIssueKey || 'Not linked' } }));
  return (
    <div className="space-y-4">
      <TableToolbar>
        <FilterSelect id="trace-has-defect" label="Has Defect" value={filters.hasDefect} options={[["all", "All Test Cases"], ["yes", "Yes"], ["no", "No"]]} onChange={(value) => onFilterChange({ ...filters, hasDefect: value as TraceabilityFilters['hasDefect'] })} />
        <FilterSelect id="trace-has-external" label="Has External Issue" value={filters.hasExternalIssue} options={[["all", "All Test Cases"], ["yes", "Yes"], ["no", "No"]]} onChange={(value) => onFilterChange({ ...filters, hasExternalIssue: value as TraceabilityFilters['hasExternalIssue'] })} />
        <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => onFilterChange({ ...EMPTY_TRACEABILITY_FILTERS })}>Clear Traceability Filters</button>
      </TableToolbar>
      <ReportDataTable title="Traceability Report" description="Testing context, latest execution, linked Defects, and external work items." rows={displayRows} columns={[
        { key: 'project', label: 'Project' }, { key: 'scenario', label: 'Scenario' }, { key: 'testCase', label: 'Test Case' }, { key: 'latestStatus', label: 'Latest Status' }, { key: 'execution', label: 'Latest Execution' }, { key: 'executionDate', label: 'Latest Execution Date' }, { key: 'defectId', label: 'Defect ID' }, { key: 'defectStatus', label: 'Defect Status' }, { key: 'severity', label: 'Severity' }, { key: 'externalSystem', label: 'External System' }, { key: 'externalKey', label: 'External Issue Key' },
      ]} onExport={onExport} />
    </div>
  );
}

function AttentionReport({ rows, onExport }: { rows: ReturnType<typeof getAttentionRows>; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  return <ReportDataTable title="Attention Needed Report" description="Failed, Blocked, No Run, and open high-risk Defects that need review." rows={rows.map((row) => ({ id: row.id, searchText: Object.values(row).join(' '), values: { category: row.category, project: row.project, scenario: row.scenario, testCase: row.testCase, defectId: row.defectId || 'Not applicable', status: row.status, severity: row.severity || 'Not applicable' } }))} columns={[
    { key: 'category', label: 'Attention Type' }, { key: 'project', label: 'Project' }, { key: 'scenario', label: 'Scenario' }, { key: 'testCase', label: 'Test Case' }, { key: 'defectId', label: 'Defect ID' }, { key: 'status', label: 'Status' }, { key: 'severity', label: 'Severity' },
  ]} onExport={onExport} />;
}

function ReportDataTable({ title, description, rows, columns, onExport }: { title: string; description: string; rows: DisplayRow[]; columns: DisplayColumn[]; onExport: (name: string, rows: ReportExportRow[]) => void }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? '');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [page, setPage] = useState(1);
  const filteredRows = rows.filter((row) => matchesSearch(search, [row.searchText]));
  const sortedRows = sortItems(filteredRows, (first, second) => {
    const firstValue = first.values[sortKey] ?? '';
    const secondValue = second.values[sortKey] ?? '';
    return typeof firstValue === 'number' && typeof secondValue === 'number'
      ? firstValue - secondValue
      : compareText(String(firstValue), String(secondValue));
  }, sortDirection);
  const paginatedRows = paginateItems(sortedRows, page);

  function handleSort(nextSortKey: string) {
    setSortDirection(getNextSortDirection(sortKey, nextSortKey, sortDirection));
    setSortKey(nextSortKey);
    setPage(1);
  }

  const exportRows = sortedRows.map((row) => Object.fromEntries(columns.map((column) => [column.label, row.values[column.key] ?? ''])));

  return (
    <section aria-label={title}>
      <ReportHeader title={title} description={description} onExport={() => onExport(title, exportRows)} />
      <div className="mt-4">
        <TableToolbar>
          <TableSearchField id={`report-search-${title.toLocaleLowerCase().replaceAll(' ', '-')}`} label={`Search ${title}`} placeholder="Search matching report rows" value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
          <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => { setSearch(''); setSortKey(columns[0]?.key ?? ''); setSortDirection('ascending'); setPage(1); }}>Clear Table Search</button>
        </TableToolbar>
      </div>
      <div className="my-3"><TableResultCount count={filteredRows.length} /></div>
      {filteredRows.length === 0 ? <TableNoResults itemName="report rows" onClear={() => setSearch('')} /> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table aria-label={`${title} data`} className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>{columns.map((column) => <SortableTableHeader key={column.key} label={column.label} sortKey={column.key} activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />)}</tr></thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedRows.items.map((row) => (
                  <tr key={row.id}>{columns.map((column, index) => {
                    const value = row.values[column.key];
                    const content: ReactNode = `${value ?? ''}${column.suffix ?? ''}`;
                    return index === 0 ? <th key={column.key} scope="row" className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold text-slate-950">{content}</th> : <td key={column.key} className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{content}</td>;
                  })}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination page={paginatedRows.page} totalPages={paginatedRows.totalPages} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
