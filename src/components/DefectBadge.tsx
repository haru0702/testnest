import type {
  DefectPriority,
  DefectSeverity,
  DefectStatus,
} from '../defects/defect';

type DefectBadgeProps =
  | { kind: 'status'; value: DefectStatus }
  | { kind: 'severity'; value: DefectSeverity }
  | { kind: 'priority'; value: DefectPriority };

const statusClasses: Record<DefectStatus, string> = {
  Open: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  'In Progress': 'bg-blue-50 text-blue-800 ring-blue-600/20',
  'Ready for Retest': 'bg-violet-50 text-violet-800 ring-violet-600/20',
  Closed: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  Reopened: 'bg-amber-50 text-amber-800 ring-amber-600/20',
};

const levelClasses: Record<DefectSeverity | DefectPriority, string> = {
  Critical: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  High: 'bg-orange-50 text-orange-800 ring-orange-600/20',
  Medium: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Low: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function DefectBadge({ kind, value }: DefectBadgeProps) {
  const classes = kind === 'status' ? statusClasses[value] : levelClasses[value];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${classes}`}
    >
      {value}
    </span>
  );
}
