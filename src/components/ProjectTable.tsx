import type { Project, ProjectStatus } from '../projects/project';

type ProjectTableProps = {
  projects: Project[];
  onEdit: (project: Project) => void;
  onRequestDelete: (project: Project) => void;
};

const statusClasses: Record<ProjectStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  'On Hold': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Completed: 'bg-blue-50 text-blue-800 ring-blue-600/20',
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function ProjectTable({
  projects,
  onEdit,
  onRequestDelete,
}: ProjectTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200" aria-label="Projects">
        <thead className="bg-slate-50">
          <tr>
            {[
              'Project ID',
              'Project Name',
              'Description',
              'Status',
              'Created Date',
              'Updated Date',
              'Actions',
            ].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {projects.map((project) => (
            <tr key={project.id}>
              <td className="max-w-44 break-all px-4 py-4 font-mono text-xs text-slate-500">
                {project.id}
              </td>
              <th
                scope="row"
                className="min-w-40 px-4 py-4 text-left text-sm font-semibold text-slate-950"
              >
                {project.name}
              </th>
              <td className="min-w-56 max-w-sm px-4 py-4 text-sm leading-6 text-slate-600">
                {project.description || 'No description'}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[project.status]}`}
                >
                  {project.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                {formatDate(project.createdDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                {formatDate(project.updatedDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Edit ${project.name}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                    onClick={() => onEdit(project)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${project.name}`}
                    className="rounded-md border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                    onClick={() => onRequestDelete(project)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
