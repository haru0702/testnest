import { DistributionChart } from '../components/DistributionChart';
import { StatCard } from '../components/StatCard';
import type { DefectFilters } from '../defects/defect';
import { loadDefects } from '../defects/defectStorage';
import type { ExecutionStatus } from '../executions/execution';
import { loadExecutions } from '../executions/executionStorage';
import { loadProjects } from '../projects/projectStorage';
import {
  EMPTY_REPORT_FILTERS,
  filterReportData,
  getAttentionSummary,
  getDefectSummary,
  getDefectsByStatus,
  getExecutionSummary,
} from '../reports/report';
import { loadScenarios, loadTestCases } from '../testCases/testCaseStorage';

export type DashboardTestCaseFilter = {
  status: ExecutionStatus;
  projectId?: string;
  scenarioId?: string;
};

type DashboardPageProps = {
  onOpenTestCases?: (filter: DashboardTestCaseFilter) => void;
  onOpenDefects?: (filters: Partial<DefectFilters>) => void;
};

export function DashboardPage({
  onOpenTestCases = () => undefined,
  onOpenDefects = () => undefined,
}: DashboardPageProps) {
  const projects = loadProjects();
  const scenarios = loadScenarios();
  const testCases = loadTestCases();
  const executions = loadExecutions();
  const defects = loadDefects();
  const filteredData = filterReportData(
    { projects, scenarios, testCases, executions, defects },
    EMPTY_REPORT_FILTERS,
  );
  const executionSummary = getExecutionSummary(testCases, executions);
  const defectSummary = getDefectSummary(defects);
  const attention = getAttentionSummary(filteredData);
  const defectStatusRows = getDefectsByStatus(defects);

  function openTestCases(status: ExecutionStatus) {
    const matchingTestCase = testCases.find(
      (testCase) =>
        (filteredData.latestExecutions.get(testCase.id)?.overallStatus ??
          'No Run') === status,
    );

    onOpenTestCases({
      status,
      projectId: matchingTestCase?.projectId,
      scenarioId: matchingTestCase?.scenarioId,
    });
  }

  const kpis = [
    { label: 'Total Projects', value: projects.length, tone: 'neutral' },
    { label: 'Total Test Cases', value: testCases.length, tone: 'neutral' },
    { label: 'Passed', value: executionSummary.counts.Passed, tone: 'success', onClick: () => openTestCases('Passed') },
    { label: 'Failed', value: executionSummary.counts.Failed, tone: 'danger', onClick: () => openTestCases('Failed') },
    { label: 'Blocked', value: executionSummary.counts.Blocked, tone: 'warning', onClick: () => openTestCases('Blocked') },
    { label: 'No Run', value: executionSummary.counts['No Run'], tone: 'muted', onClick: () => openTestCases('No Run') },
    { label: 'Total Defects', value: defectSummary.total, tone: 'neutral' },
    { label: 'Open Defects', value: defectSummary.statuses.Open, tone: 'danger', onClick: () => onOpenDefects({ status: 'Open' }) },
    { label: 'Critical Defects', value: defectSummary.severities.Critical, tone: 'danger', onClick: () => onOpenDefects({ severity: 'Critical' }) },
    { label: 'Ready for Retest', value: defectSummary.statuses['Ready for Retest'], tone: 'warning', onClick: () => onOpenDefects({ status: 'Ready for Retest' }) },
  ] as const;

  const attentionItems = [
    ['Failed Test Cases without an active linked Defect', attention.failedWithoutDefect],
    ['Blocked Test Cases without an active linked Defect', attention.blockedWithoutDefect],
    ['Critical Open Defects', attention.criticalOpenDefects],
    ['Defects Ready for Retest', attention.readyForRetest],
    ['No Run Test Cases', attention.noRunTestCases],
  ] as const;

  return (
    <section aria-label="QA health dashboard" className="space-y-8">
      <section aria-labelledby="dashboard-kpis">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="dashboard-kpis" className="text-xl font-semibold text-slate-950">
              QA Health
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Current status based on the latest execution of every Test Case.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600">
            Execution completion: {executionSummary.completionPercentage}%
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      <section aria-labelledby="attention-needed-title">
        <h3 id="attention-needed-title" className="text-xl font-semibold text-slate-950">
          Attention Needed
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {attentionItems.map(([label, count]) => (
            <article
              key={label}
              aria-label={`${label}: ${count}`}
              className={`rounded-lg border p-4 shadow-sm ${
                count === 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-white'
              }`}
            >
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{count}</p>
              <p className={`mt-2 text-xs font-medium ${count === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {count === 0 ? 'No records need attention' : 'Review recommended'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="dashboard-summaries-title">
        <h3 id="dashboard-summaries-title" className="text-xl font-semibold text-slate-950">
          Current Distribution
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DistributionChart
            id="dashboard-execution-chart"
            title="Execution Status Distribution"
            emptyMessage="No Test Cases are available yet."
            items={[
              { label: 'Passed', count: executionSummary.counts.Passed, percentage: executionSummary.percentages.Passed, tone: 'success' },
              { label: 'Failed', count: executionSummary.counts.Failed, percentage: executionSummary.percentages.Failed, tone: 'danger' },
              { label: 'Blocked', count: executionSummary.counts.Blocked, percentage: executionSummary.percentages.Blocked, tone: 'warning' },
              { label: 'No Run', count: executionSummary.counts['No Run'], percentage: executionSummary.percentages['No Run'], tone: 'muted' },
            ]}
          />
          <DistributionChart
            id="dashboard-defect-chart"
            title="Defect Status Distribution"
            emptyMessage="No Defects are currently recorded."
            items={defectStatusRows.map((row) => ({
              label: row.category,
              count: row.count,
              percentage: row.percentage,
              tone:
                row.category === 'Closed'
                  ? 'success'
                  : row.category === 'Ready for Retest'
                    ? 'warning'
                    : row.category === 'Open'
                      ? 'danger'
                      : 'neutral',
            }))}
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-defect-summary">
        <h3 id="dashboard-defect-summary" className="text-xl font-semibold text-slate-950">
          Defect Summary
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ['Total Defects', defectSummary.total],
            ['Open', defectSummary.statuses.Open],
            ['In Progress', defectSummary.statuses['In Progress']],
            ['Ready for Retest', defectSummary.statuses['Ready for Retest']],
            ['Closed', defectSummary.statuses.Closed],
            ['Reopened', defectSummary.statuses.Reopened],
            ['Critical', defectSummary.severities.Critical],
            ['High', defectSummary.severities.High],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs font-medium text-slate-600">{label}</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
