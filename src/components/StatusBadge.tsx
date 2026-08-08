import type { ExecutionStatus } from '../executions/execution';

type StatusBadgeProps = {
  status: ExecutionStatus;
};

const statusClasses: Record<ExecutionStatus, string> = {
  Passed: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  Failed: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  Blocked: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'No Run': 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
