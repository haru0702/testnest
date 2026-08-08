import type { Defect, DefectSortKey } from '../defects/defect';
import type { Project } from '../projects/project';
import type { SortDirection } from '../table/tableUtils';
import { DefectBadge } from './DefectBadge';
import { SortableTableHeader, TableHeader } from './TableControls';

type DefectTableProps = {
  defects: Defect[];
  projects: Project[];
  sortKey: DefectSortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: DefectSortKey) => void;
  onView: (defect: Defect) => void;
  onEdit: (defect: Defect) => void;
  onRequestDelete: (defect: Defect) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function DefectTable({
  defects,
  projects,
  sortKey,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onRequestDelete,
}: DefectTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200" aria-label="Defects">
        <thead className="bg-slate-50">
          <tr>
            <SortableTableHeader label="Defect ID" sortKey="defectId" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Title" sortKey="title" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <TableHeader label="Project" />
            <SortableTableHeader label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Severity" sortKey="severity" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Priority" sortKey="priority" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <TableHeader label="Assignee" />
            <SortableTableHeader label="Created Date" sortKey="createdDate" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableTableHeader label="Updated Date" sortKey="updatedDate" activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <TableHeader label="Actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {defects.map((defect) => {
            const project = projects.find((item) => item.id === defect.projectId);
            return (
              <tr key={defect.id}>
                <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-semibold text-teal-700">{defect.defectId}</td>
                <th scope="row" className="min-w-56 max-w-sm px-4 py-4 text-left text-sm font-semibold text-slate-950">{defect.title}</th>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{project?.name ?? 'Not linked'}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm"><DefectBadge kind="status" value={defect.status} /></td>
                <td className="whitespace-nowrap px-4 py-4 text-sm"><DefectBadge kind="severity" value={defect.severity} /></td>
                <td className="whitespace-nowrap px-4 py-4 text-sm"><DefectBadge kind="priority" value={defect.priority} /></td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{defect.assigneeName || 'Unassigned'}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{dateFormatter.format(new Date(defect.createdDate))}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{dateFormatter.format(new Date(defect.updatedDate))}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm">
                  <div className="flex gap-2">
                    <button type="button" aria-label={`View ${defect.defectId}`} className="rounded-md border border-teal-200 bg-white px-3 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={() => onView(defect)}>View</button>
                    <button type="button" aria-label={`Edit ${defect.defectId}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700" onClick={() => onEdit(defect)}>Edit</button>
                    <button type="button" aria-label={`Delete ${defect.defectId}`} className="rounded-md border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700" onClick={() => onRequestDelete(defect)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
