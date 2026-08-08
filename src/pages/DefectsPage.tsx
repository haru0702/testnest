import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DefectDetails, type DefectExecutionContext } from '../components/DefectDetails';
import { DefectForm } from '../components/DefectForm';
import { DefectTable } from '../components/DefectTable';
import { StatCard } from '../components/StatCard';
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
  compareDefects,
  createDefect,
  DEFECT_PRIORITIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  EMPTY_DEFECT_FILTERS,
  EMPTY_DEFECT_FORM_VALUES,
  EXTERNAL_SYSTEMS,
  filterDefects,
  normalizeDefectValues,
  validateDefectForm,
  type Defect,
  type DefectFilters,
  type DefectFormValues,
  type DefectSortKey,
} from '../defects/defect';
import { loadDefects, saveDefects } from '../defects/defectStorage';
import { loadExecutions } from '../executions/executionStorage';
import { loadProjects } from '../projects/projectStorage';
import {
  getNextSortDirection,
  paginateItems,
  sortItems,
  type SortDirection,
} from '../table/tableUtils';
import { loadScenarios, loadTestCases } from '../testCases/testCaseStorage';
import { assignCreatedAudit, assignUpdatedAudit, type User } from '../users/user';
import { canDeleteDefect, canEditDefect, hasPermission, PERMISSION_DENIED_MESSAGE } from '../users/permissions';

type DefectsPageProps = {
  initialDraft?: DefectFormValues | null;
  initialFilters?: Partial<DefectFilters>;
  onDraftConsumed?: () => void;
  onViewExecution?: (context: DefectExecutionContext) => void;
  users: User[];
  activeUser: User;
  onPermissionDenied: () => void;
};

type FormMode = 'create' | 'edit' | null;

export function DefectsPage({
  initialDraft = null,
  initialFilters = {},
  onDraftConsumed = () => undefined,
  onViewExecution = () => undefined,
  users,
  activeUser,
  onPermissionDenied,
}: DefectsPageProps) {
  const [projects] = useState(() => loadProjects());
  const [scenarios] = useState(() => loadScenarios());
  const [testCases] = useState(() => loadTestCases());
  const [executions] = useState(() => loadExecutions());
  const [defects, setDefects] = useState<Defect[]>(() => loadDefects());
  const canCreate = hasPermission(activeUser, 'canCreateDefects');
  const canAssign = hasPermission(activeUser, 'canAssignDefects');
  const canManageStatus = hasPermission(activeUser, 'canManageDefectStatus') || canCreate;
  const [formMode, setFormMode] = useState<FormMode>(initialDraft && canCreate ? 'create' : null);
  const [draft, setDraft] = useState<DefectFormValues | null>(initialDraft && canCreate ? initialDraft : null);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Defect | null>(null);
  const [filters, setFilters] = useState<DefectFilters>({
    ...EMPTY_DEFECT_FILTERS,
    ...initialFilters,
  });
  const [sortKey, setSortKey] = useState<DefectSortKey>('updatedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialDraft) {
      onDraftConsumed();
    }
  }, [initialDraft, onDraftConsumed]);

  const filteredDefects = filterDefects(defects, filters);
  const sortedDefects = sortItems(
    filteredDefects,
    (first, second) => compareDefects(first, second, sortKey),
    sortDirection,
  );
  const paginatedDefects = paginateItems(sortedDefects, page);
  const assignees = [...new Set(defects.map((defect) => defect.assigneeName).filter(Boolean))].sort();
  const summary = {
    total: defects.length,
    open: defects.filter((defect) => defect.status === 'Open').length,
    inProgress: defects.filter((defect) => defect.status === 'In Progress').length,
    ready: defects.filter((defect) => defect.status === 'Ready for Retest').length,
    closed: defects.filter((defect) => defect.status === 'Closed').length,
    critical: defects.filter((defect) => defect.severity === 'Critical').length,
  };

  function updateFilter<Key extends keyof DefectFilters>(
    key: Key,
    value: DefectFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ ...EMPTY_DEFECT_FILTERS });
    setSortKey('updatedDate');
    setSortDirection('descending');
    setPage(1);
  }

  function handleSort(nextSortKey: DefectSortKey) {
    setSortDirection(getNextSortDirection(sortKey, nextSortKey, sortDirection));
    setSortKey(nextSortKey);
    setPage(1);
  }

  function closeForm() {
    setFormMode(null);
    setEditingDefect(null);
    setDraft(null);
  }

  function openCreateForm() {
    if (!canCreate) {
      onPermissionDenied();
      return;
    }
    setEditingDefect(null);
    setSelectedDefect(null);
    setFormMode('create');
  }

  function openEditForm(defect: Defect) {
    if (!canEditDefect(activeUser, defect)) {
      onPermissionDenied();
      return;
    }
    setEditingDefect(defect);
    setSelectedDefect(null);
    setFormMode('edit');
  }

  function handleSubmit(values: DefectFormValues) {
    if (editingDefect ? !canEditDefect(activeUser, editingDefect) : !canCreate) {
      onPermissionDenied();
      return { titleError: PERMISSION_DENIED_MESSAGE, externalIssueUrlError: null };
    }
    const errors = validateDefectForm(values);

    if (errors.titleError || errors.externalIssueUrlError) {
      return errors;
    }

    const nextDefects = editingDefect
      ? defects.map((defect) =>
          defect.id === editingDefect.id
            ? assignUpdatedAudit({
                ...defect,
                ...normalizeDefectValues(values, users),
                updatedDate: new Date().toISOString(),
              }, activeUser)
            : defect,
        )
      : [...defects, assignCreatedAudit(createDefect(values, defects, { users }), activeUser)];

    saveDefects(nextDefects);
    setDefects(nextDefects);
    closeForm();
    return { titleError: null, externalIssueUrlError: null };
  }

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    if (!canDeleteDefect(activeUser)) {
      onPermissionDenied();
      return;
    }

    const nextDefects = defects.filter((defect) => defect.id !== deleteTarget.id);
    saveDefects(nextDefects);
    setDefects(nextDefects);
    if (selectedDefect?.id === deleteTarget.id) {
      setSelectedDefect(null);
    }
    setDeleteTarget(null);
  }

  return (
    <section aria-label="Defect management">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Track defects, testing context, ownership, and external work-item links.
        </p>
        {formMode || defects.length === 0 || !canCreate ? null : (
          <button type="button" className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={openCreateForm}>
            Add Defect
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Defects" value={summary.total} tone="neutral" />
        <StatCard label="Open" value={summary.open} tone="danger" />
        <StatCard label="In Progress" value={summary.inProgress} tone="neutral" />
        <StatCard label="Ready for Retest" value={summary.ready} tone="warning" />
        <StatCard label="Closed" value={summary.closed} tone="success" />
        <StatCard label="Critical" value={summary.critical} tone="danger" />
      </div>

      <div className="mt-6">
        {formMode ? (
          <DefectForm
            key={editingDefect?.id ?? draft?.executionId ?? 'new-defect'}
            defect={editingDefect ?? undefined}
            initialValues={!editingDefect ? draft ?? { ...EMPTY_DEFECT_FORM_VALUES } : undefined}
            projects={projects}
            scenarios={scenarios}
            testCases={testCases}
            executions={executions}
            users={users}
            activeUser={activeUser}
            canAssignDefects={canAssign}
            canManageStatus={canManageStatus}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        ) : selectedDefect ? (
          <DefectDetails
            defect={selectedDefect}
            projects={projects}
            scenarios={scenarios}
            testCases={testCases}
            executions={executions}
            onClose={() => setSelectedDefect(null)}
            onViewExecution={onViewExecution}
          />
        ) : defects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-slate-950">No defects yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Add a standalone defect or create one from a Failed or Blocked execution.
            </p>
            {canCreate ? <button type="button" className="mt-5 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" onClick={openCreateForm}>
              Add Defect
            </button> : null}
          </div>
        ) : (
          <>
            <TableToolbar>
              <TableSearchField id="defect-search" label="Search defects" placeholder="Search ID, title, description, or external key" value={filters.searchQuery} onChange={(value) => updateFilter('searchQuery', value)} />
              <TableFilterSelect id="defect-project-filter" label="Filter by Project" value={filters.projectId} options={[{ value: 'all', label: 'All Projects' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} onChange={(value) => updateFilter('projectId', value)} />
              <TableFilterSelect id="defect-status-filter" label="Filter by Status" value={filters.status} options={[{ value: 'all', label: 'All Statuses' }, ...DEFECT_STATUSES.map((status) => ({ value: status, label: status }))]} onChange={(value) => updateFilter('status', value as DefectFilters['status'])} />
              <TableFilterSelect id="defect-severity-filter" label="Filter by Severity" value={filters.severity} options={[{ value: 'all', label: 'All Severities' }, ...DEFECT_SEVERITIES.map((severity) => ({ value: severity, label: severity }))]} onChange={(value) => updateFilter('severity', value as DefectFilters['severity'])} />
              <TableFilterSelect id="defect-priority-filter" label="Filter by Priority" value={filters.priority} options={[{ value: 'all', label: 'All Priorities' }, ...DEFECT_PRIORITIES.map((priority) => ({ value: priority, label: priority }))]} onChange={(value) => updateFilter('priority', value as DefectFilters['priority'])} />
              <TableFilterSelect id="defect-assignee-filter" label="Filter by Assignee" value={filters.assignee} options={[{ value: 'all', label: 'All Assignees' }, ...assignees.map((assignee) => ({ value: assignee, label: assignee }))]} onChange={(value) => updateFilter('assignee', value)} />
              <TableFilterSelect id="defect-external-system-filter" label="Filter by External System" value={filters.externalSystem} options={[{ value: 'all', label: 'All External Systems' }, ...EXTERNAL_SYSTEMS.map((system) => ({ value: system, label: system }))]} onChange={(value) => updateFilter('externalSystem', value as DefectFilters['externalSystem'])} />
              <TableFilterSelect id="defect-execution-link-filter" label="Linked to Test Execution" value={filters.linkedToExecution} options={[{ value: 'all', label: 'All Defects' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} onChange={(value) => updateFilter('linkedToExecution', value as DefectFilters['linkedToExecution'])} />
              <TableFilterSelect id="defect-external-link-filter" label="External Issue Linked" value={filters.externalIssueLinked} options={[{ value: 'all', label: 'All Defects' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} onChange={(value) => updateFilter('externalIssueLinked', value as DefectFilters['externalIssueLinked'])} />
              <ClearFiltersButton onClick={clearFilters} />
            </TableToolbar>

            <div className="my-3"><TableResultCount count={filteredDefects.length} /></div>

            {filteredDefects.length > 0 ? (
              <>
                <DefectTable defects={paginatedDefects.items} projects={projects} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} onView={setSelectedDefect} onEdit={openEditForm} onRequestDelete={setDeleteTarget} canEdit={(defect) => canEditDefect(activeUser, defect)} canDelete={canDeleteDefect(activeUser)} />
                <TablePagination page={paginatedDefects.page} totalPages={paginatedDefects.totalPages} onPageChange={setPage} />
              </>
            ) : (
              <TableNoResults itemName="defects" onClear={clearFilters} />
            )}
          </>
        )}
      </div>

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete defect?"
          description={`Delete ${deleteTarget.defectId} "${deleteTarget.title}"? Linked test data and external issues will not be changed.`}
          confirmLabel="Delete Defect"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </section>
  );
}
