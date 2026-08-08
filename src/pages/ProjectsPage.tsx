import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProjectForm } from '../components/ProjectForm';
import {
  ClearFiltersButton,
  TableFilterSelect,
  TableNoResults,
  TablePagination,
  TableResultCount,
  TableSearchField,
  TableToolbar,
} from '../components/TableControls';
import {
  ProjectTable,
  type ProjectSortKey,
} from '../components/ProjectTable';
import {
  getProjectNameError,
  normalizeProjectName,
  PROJECT_STATUSES,
  type Project,
  type ProjectFormValues,
  type ProjectStatus,
} from '../projects/project';
import { loadProjects, saveProjects } from '../projects/projectStorage';
import { deleteProjectTestData } from '../testCases/testCaseStorage';
import { deleteProjectExecutions } from '../executions/executionStorage';
import { assignCreatedAudit, assignUpdatedAudit, type User } from '../users/user';
import { hasPermission, PERMISSION_DENIED_MESSAGE } from '../users/permissions';
import {
  compareDates,
  compareText,
  filterItems,
  getNextSortDirection,
  matchesSearch,
  paginateItems,
  sortItems,
  type SortDirection,
} from '../table/tableUtils';

type FormMode = 'create' | 'edit' | null;

type ProjectsPageProps = {
  activeUser: User;
  onPermissionDenied: () => void;
};

export function ProjectsPage({ activeUser, onPermissionDenied }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>(
    'all',
  );
  const [sortKey, setSortKey] = useState<ProjectSortKey>('updatedDate');
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('descending');
  const [page, setPage] = useState(1);

  const filteredProjects = filterItems(projects, [
    (project) => matchesSearch(searchQuery, [project.name]),
    (project) => statusFilter === 'all' || project.status === statusFilter,
  ]);
  const sortedProjects = sortItems(
    filteredProjects,
    (first, second) => {
      switch (sortKey) {
        case 'name':
          return compareText(first.name, second.name);
        case 'status':
          return compareText(first.status, second.status);
        case 'createdDate':
          return compareDates(first.createdDate, second.createdDate);
        case 'updatedDate':
          return compareDates(first.updatedDate, second.updatedDate);
      }
    },
    sortDirection,
  );
  const paginatedProjects = paginateItems(sortedProjects, page);
  const canCreate = hasPermission(activeUser, 'canCreateProjects');
  const canEdit = hasPermission(activeUser, 'canEditProjects');
  const canDelete = hasPermission(activeUser, 'canDeleteProjects');

  function guard(permission: 'canCreateProjects' | 'canEditProjects' | 'canDeleteProjects') {
    if (hasPermission(activeUser, permission)) return true;
    onPermissionDenied();
    return false;
  }

  function handleSort(nextSortKey: ProjectSortKey) {
    setSortDirection(
      getNextSortDirection(sortKey, nextSortKey, sortDirection),
    );
    setSortKey(nextSortKey);
    setPage(1);
  }

  function clearFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setSortKey('updatedDate');
    setSortDirection('descending');
    setPage(1);
  }

  function closeForm() {
    setFormMode(null);
    setEditingProject(null);
  }

  function openCreateForm() {
    if (!guard('canCreateProjects')) return;
    setEditingProject(null);
    setFormMode('create');
  }

  function openEditForm(project: Project) {
    if (!guard('canEditProjects')) return;
    setEditingProject(project);
    setFormMode('edit');
  }

  function handleSubmit(values: ProjectFormValues) {
    if (!guard(editingProject ? 'canEditProjects' : 'canCreateProjects')) {
      return PERMISSION_DENIED_MESSAGE;
    }
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
            ? assignUpdatedAudit({ ...project, ...normalizedValues, updatedDate: now }, activeUser)
            : project,
        )
      : [
          ...projects,
          assignCreatedAudit({
            id: crypto.randomUUID(),
            ...normalizedValues,
            createdDate: now,
            updatedDate: now,
          }, activeUser),
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
    if (!guard('canDeleteProjects')) return;

    const nextProjects = projects.filter(
      (project) => project.id !== deleteTarget.id,
    );

    saveProjects(nextProjects);
    deleteProjectTestData(deleteTarget.id);
    deleteProjectExecutions(deleteTarget.id);
    setProjects(nextProjects);
    setDeleteTarget(null);
  }

  return (
    <section aria-label="Project management">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Create and maintain the projects that organize your QA work.
        </p>
        {formMode || projects.length === 0 || !canCreate ? null : (
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
            {canCreate ? <button
              type="button"
              className="mt-5 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              onClick={openCreateForm}
            >
              Create Project
            </button> : null}
          </div>
        ) : (
          <>
            <TableToolbar>
              <TableSearchField
                id="project-search"
                label="Search projects"
                placeholder="Search by project name"
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setPage(1);
                }}
              />
              <TableFilterSelect
                id="project-status-filter"
                label="Filter by Status"
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  ...PROJECT_STATUSES.map((status) => ({
                    value: status,
                    label: status,
                  })),
                ]}
                onChange={(value) => {
                  setStatusFilter(value as 'all' | ProjectStatus);
                  setPage(1);
                }}
              />
              <ClearFiltersButton onClick={clearFilters} />
            </TableToolbar>

            <div className="my-3">
              <TableResultCount count={filteredProjects.length} />
            </div>

            {filteredProjects.length > 0 ? (
              <>
                <ProjectTable
                  projects={paginatedProjects.items}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onEdit={openEditForm}
                  onRequestDelete={setDeleteTarget}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
                <TablePagination
                  page={paginatedProjects.page}
                  totalPages={paginatedProjects.totalPages}
                  onPageChange={setPage}
                />
              </>
            ) : (
              <TableNoResults itemName="projects" onClear={clearFilters} />
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
