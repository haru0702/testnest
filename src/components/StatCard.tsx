type StatCardProps = {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'danger' | 'warning' | 'muted';
  onClick?: () => void;
  actionLabel?: string;
};

const toneClasses: Record<StatCardProps['tone'], string> = {
  neutral: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  muted: 'border-slate-200 bg-white text-slate-900',
};

export function StatCard({
  label,
  value,
  tone,
  onClick,
  actionLabel,
}: StatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
      {onClick ? (
        <p className="mt-3 text-xs font-semibold underline decoration-current/30 underline-offset-4">
          View matching records
        </p>
      ) : null}
    </>
  );

  return onClick ? (
    <button
      type="button"
      aria-label={actionLabel ?? `${label}: ${value}`}
      className={`rounded-lg border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${toneClasses[tone]}`}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <article
      aria-label={`${label}: ${value}`}
      className={`rounded-lg border p-5 shadow-sm ${toneClasses[tone]}`}
    >
      {content}
    </article>
  );
}
