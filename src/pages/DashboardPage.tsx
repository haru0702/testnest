import { StatCard } from '../components/StatCard';
import { getLatestExecutionStatusCounts } from '../executions/execution';
import { loadExecutions } from '../executions/executionStorage';
import { loadProjects } from '../projects/projectStorage';
import { loadTestCases } from '../testCases/testCaseStorage';

export function DashboardPage() {
  const projects = loadProjects();
  const testCases = loadTestCases();
  const executionCounts = getLatestExecutionStatusCounts(
    testCases,
    loadExecutions(),
  );
  const dashboardStats = [
    { label: 'Total Projects', value: projects.length, tone: 'neutral' },
    { label: 'Total Test Cases', value: testCases.length, tone: 'neutral' },
    { label: 'Passed', value: executionCounts.Passed, tone: 'success' },
    { label: 'Failed', value: executionCounts.Failed, tone: 'danger' },
    { label: 'Blocked', value: executionCounts.Blocked, tone: 'warning' },
    { label: 'No Run', value: executionCounts['No Run'], tone: 'muted' },
  ] as const;

  return (
    <section aria-labelledby="dashboard-metrics">
      <h3 id="dashboard-metrics" className="sr-only">
        Dashboard metrics
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
          />
        ))}
      </div>
    </section>
  );
}
