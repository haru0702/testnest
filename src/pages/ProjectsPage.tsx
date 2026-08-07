import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectTable } from '../components/ProjectTable';
import {
  getProjectNameError,
  normalizeProjectName,
  type Project,
  type ProjectFormValues,
} from '../projects/project';
import { loadProjects, saveProjects } from '../projects/projectStorage';
import { deleteProjectTestData } from '../testCases/testCaseStorage';

type FormMode = 'create' | 'edit' | null;

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const comparableSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredProjects = projects.filter((project) =>
    project.name.toLocaleLowerCase().includes(comparableSearch),
  );

  function closeForm() {
    setFormMode(null);
    setEditingProject(null);
  }

  function openCreateForm() {
    setEditingProject(null);
    setFormMode('create');
  }

  function openEditForm(project: Project) {
    setEditingProject(project);
    setFormMode('edit');
  }

  function handleSubmit(values: ProjectFormValues) {
    const nameError = getProjectNameError(
      values.name,
      projects,
      editingProject?.id,
    );

    if (nameError) {
      return nameError;
    }

    const now = new Date().toISOString();
    const normalizedValues = {
      ...values,
      name: normalizeProjectName(values.name),
      description: values.description.trim(),
    };

    const nextProjects = editingProject
      ? projects.map((project) =>
          project.id === editingProject.id
            ? { ...project, ...normalizedValues, updatedDate: now }
            : project,
        )
      : [
          ...projects,
          {
            id: crypto.randomUUID(),
            ...normalizedValues,
            createdDate: now,
            updatedDate: now,
          },
        ];

    saveProjects(nextProjects);
    setProjects(nextProjects);
    closeForm();

    return null;
  }

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    const nextProjects = projects.filter(
      (project) => project.id !== deleteTarget.id,
    );

    saveProjects(nextProjects);
    deleteProjectTestData(deleteTarget.id);
    setProjects(nextProjects);
    setDeleteTarget(null);
  }

  return (
    <section aria-label="Project management">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Create and maintain the projects that organize your QA work.
        </p>
        {formMode || projects.length === 0 ? null : (
          <button
            type="button"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={openCreateForm}
          >
            Create Project
          </button>
        )}
      </div>

      <div className="mt-6">
        {formMode ? (
          <ProjectForm
            key={editingProject?.id ?? 'new-project'}
            project={editingProject ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-slate-950">
              No projects yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Create your first project to start organizing test cases and test
              runs.
            </p>
            <button
              type="button"
              className="mt-5 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              onClick={openCreateForm}
            >
              Create Project
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 max-w-md">
              <label
                className="block text-sm font-medium text-slate-800"
                htmlFor="project-search"
              >
                Search projects
              </label>
              <input
                id="project-search"
                type="search"
                placeholder="Search by project name"
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            {filteredProjects.length > 0 ? (
              <ProjectTable
                projects={filteredProjects}
                onEdit={openEditForm}
                onRequestDelete={setDeleteTarget}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <p className="font-semibold text-slate-950">
                  No projects match your search.
                </p>
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete project?"
          description={`Delete "${deleteTarget.name}"? Its scenarios and test cases will also be deleted.`}
          confirmLabel="Delete Project"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </section>
  );
}
