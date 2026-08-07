import { useState, type FormEvent } from 'react';
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectFormValues,
  type ProjectStatus,
} from '../projects/project';

type ProjectFormProps = {
  project?: Project;
  onSubmit: (values: ProjectFormValues) => string | null;
  onCancel: () => void;
};

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? 'Active',
  );
  const [nameError, setNameError] = useState<string | null>(null);

  const isEditing = Boolean(project);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = onSubmit({ name, description, status });

    if (validationError) {
      setNameError(validationError);
    }
  }

  return (
    <section
      aria-labelledby="project-form-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h3
        id="project-form-title"
        className="text-xl font-semibold text-slate-950"
      >
        {isEditing ? 'Edit Project' : 'Create Project'}
      </h3>

      <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="project-name"
          >
            Project Name
          </label>
          <input
            id="project-name"
            name="projectName"
            type="text"
            autoFocus
            aria-describedby={nameError ? 'project-name-error' : undefined}
            aria-invalid={Boolean(nameError)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
            }}
          />
          {nameError ? (
            <p id="project-name-error" className="mt-2 text-sm text-rose-700">
              {nameError}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="project-description"
          >
            Description
          </label>
          <textarea
            id="project-description"
            name="projectDescription"
            rows={4}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="project-status"
          >
            Status
          </label>
          <select
            id="project-status"
            name="projectStatus"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:max-w-xs"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ProjectStatus)
            }
          >
            {PROJECT_STATUSES.map((projectStatus) => (
              <option key={projectStatus} value={projectStatus}>
                {projectStatus}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Save Project
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
