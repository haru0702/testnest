import { StatCard } from '../components/StatCard';

const dashboardStats = [
  { label: 'Total Projects', value: 0, tone: 'neutral' },
  { label: 'Total Test Cases', value: 0, tone: 'neutral' },
  { label: 'Passed', value: 0, tone: 'success' },
  { label: 'Failed', value: 0, tone: 'danger' },
  { label: 'Blocked', value: 0, tone: 'warning' },
  { label: 'No Run', value: 0, tone: 'muted' },
] as const;

export function DashboardPage() {
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
