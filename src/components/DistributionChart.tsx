type DistributionItem = {
  label: string;
  count: number;
  percentage: number;
  tone: 'success' | 'danger' | 'warning' | 'neutral' | 'muted';
};

type DistributionChartProps = {
  id: string;
  title: string;
  items: DistributionItem[];
  emptyMessage: string;
};

const barClasses: Record<DistributionItem['tone'], string> = {
  success: 'bg-emerald-500',
  danger: 'bg-rose-500',
  warning: 'bg-amber-500',
  neutral: 'bg-blue-500',
  muted: 'bg-slate-400',
};

export function DistributionChart({
  id,
  title,
  items,
  emptyMessage,
}: DistributionChartProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h4 id={id} className="text-base font-semibold text-slate-950">
        {title}
      </h4>
      {total === 0 ? (
        <p className="mt-4 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-5 space-y-4" aria-label={`${title} data`}>
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="whitespace-nowrap text-slate-600">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-sm bg-slate-100"
                role="img"
                aria-label={`${item.label}: ${item.count}, ${item.percentage}%`}
              >
                <div
                  className={`h-full ${barClasses[item.tone]}`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
