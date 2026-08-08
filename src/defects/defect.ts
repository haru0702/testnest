import {
  getLatestExecutionsByTestCase,
  type StepExecutionResult,
  type TestExecution,
} from '../executions/execution';
import {
  compareDates,
  compareText,
  matchesSearch,
} from '../table/tableUtils';
import type { TestCase } from '../testCases/testCase';
import type { AuditedRecord, UserReference } from '../users/user';
import { createUserReference, type User } from '../users/user';

export const DEFECT_STATUSES = [
  'Open',
  'In Progress',
  'Ready for Retest',
  'Closed',
  'Reopened',
] as const;

export const DEFECT_SEVERITIES = [
  'Critical',
  'High',
  'Medium',
  'Low',
] as const;

export const DEFECT_PRIORITIES = [
  'Critical',
  'High',
  'Medium',
  'Low',
] as const;

export const EXTERNAL_SYSTEMS = [
  'Jira',
  'Azure DevOps',
  'GitHub Issues',
  'Other',
] as const;

export type DefectStatus = (typeof DEFECT_STATUSES)[number];
export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];
export type DefectPriority = (typeof DEFECT_PRIORITIES)[number];
export type ExternalSystem = (typeof EXTERNAL_SYSTEMS)[number];

export type Defect = AuditedRecord & {
  id: string;
  defectId: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  status: DefectStatus;
  severity: DefectSeverity;
  priority: DefectPriority;
  assigneeName: string;
  reporterName: string;
  assignee?: UserReference;
  reporter?: UserReference;
  projectId?: string;
  scenarioId?: string;
  testCaseId?: string;
  executionId?: string;
  testStepId?: string;
  testStepNumber?: number;
  externalSystem?: ExternalSystem;
  externalIssueKey?: string;
  externalIssueUrl?: string;
  createdDate: string;
  updatedDate: string;
};

export type DefectFormValues = Omit<
  Defect,
  | 'id'
  | 'defectId'
  | 'createdDate'
  | 'updatedDate'
  | 'projectId'
  | 'scenarioId'
  | 'testCaseId'
  | 'executionId'
  | 'testStepId'
  | 'externalSystem'
  | 'externalIssueKey'
  | 'externalIssueUrl'
  | 'assignee'
  | 'reporter'
  | 'createdBy'
  | 'updatedBy'
> & {
  projectId: string;
  scenarioId: string;
  testCaseId: string;
  executionId: string;
  testStepId: string;
  externalSystem: '' | ExternalSystem;
  externalIssueKey: string;
  externalIssueUrl: string;
  assigneeUserId?: string;
  reporterUserId?: string;
};

export type DefectFormErrors = {
  titleError: string | null;
  externalIssueUrlError: string | null;
};

export const DEFECT_TITLE_REQUIRED_ERROR = 'Defect Title is required.';
export const EXTERNAL_URL_ERROR =
  'External Issue URL must start with http:// or https://.';

export const EMPTY_DEFECT_FORM_VALUES: DefectFormValues = {
  title: '',
  description: '',
  stepsToReproduce: '',
  expectedResult: '',
  actualResult: '',
  status: 'Open',
  severity: 'Medium',
  priority: 'Medium',
  assigneeName: '',
  reporterName: '',
  projectId: '',
  scenarioId: '',
  testCaseId: '',
  executionId: '',
  testStepId: '',
  testStepNumber: undefined,
  externalSystem: '',
  externalIssueKey: '',
  externalIssueUrl: '',
  assigneeUserId: '',
  reporterUserId: '',
};

export function getDefectTitleError(title: string) {
  return title.trim() ? null : DEFECT_TITLE_REQUIRED_ERROR;
}

export function getExternalIssueUrlError(url: string) {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? null
      : EXTERNAL_URL_ERROR;
  } catch {
    return EXTERNAL_URL_ERROR;
  }
}

export function validateDefectForm(
  values: DefectFormValues,
): DefectFormErrors {
  return {
    titleError: getDefectTitleError(values.title),
    externalIssueUrlError: getExternalIssueUrlError(
      values.externalIssueUrl,
    ),
  };
}

export function normalizeDefectValues(
  values: DefectFormValues,
  users: readonly User[] = [],
) {
  const assignee = users.find((user) => user.id === values.assigneeUserId);
  const reporter = users.find((user) => user.id === values.reporterUserId);
  const { assigneeUserId: _assigneeUserId, reporterUserId: _reporterUserId, ...recordValues } = values;
  const normalized = {
    ...recordValues,
    title: values.title.trim(),
    description: values.description.trim(),
    stepsToReproduce: values.stepsToReproduce.trim(),
    expectedResult: values.expectedResult.trim(),
    actualResult: values.actualResult.trim(),
    assigneeName: assignee?.displayName ?? values.assigneeName.trim(),
    reporterName: reporter?.displayName ?? values.reporterName.trim(),
    assignee: assignee ? createUserReference(assignee) : undefined,
    reporter: reporter ? createUserReference(reporter) : undefined,
    projectId: values.projectId || undefined,
    scenarioId: values.scenarioId || undefined,
    testCaseId: values.testCaseId || undefined,
    executionId: values.executionId || undefined,
    testStepId: values.testStepId || undefined,
    externalSystem: values.externalSystem || undefined,
    externalIssueKey: values.externalIssueKey.trim() || undefined,
    externalIssueUrl: values.externalIssueUrl.trim() || undefined,
  };

  if (!normalized.testStepId) {
    normalized.testStepNumber = undefined;
  }

  return normalized;
}

export function generateNextDefectId(defects: readonly Pick<Defect, 'defectId'>[]) {
  const highestNumber = defects.reduce((highest, defect) => {
    const match = /^DEF-(\d+)$/.exec(defect.defectId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `DEF-${String(highestNumber + 1).padStart(4, '0')}`;
}

export function createDefect(
  values: DefectFormValues,
  existingDefects: readonly Defect[],
  options: { id?: string; now?: string; users?: readonly User[] } = {},
): Defect {
  const now = options.now ?? new Date().toISOString();

  return {
    ...normalizeDefectValues(values, options.users),
    id: options.id ?? crypto.randomUUID(),
    defectId: generateNextDefectId(existingDefects),
    createdDate: now,
    updatedDate: now,
  };
}

export function getDefectFormValues(defect: Defect): DefectFormValues {
  return {
    title: defect.title,
    description: defect.description,
    stepsToReproduce: defect.stepsToReproduce,
    expectedResult: defect.expectedResult,
    actualResult: defect.actualResult,
    status: defect.status,
    severity: defect.severity,
    priority: defect.priority,
    assigneeName: defect.assigneeName,
    reporterName: defect.reporterName,
    projectId: defect.projectId ?? '',
    scenarioId: defect.scenarioId ?? '',
    testCaseId: defect.testCaseId ?? '',
    executionId: defect.executionId ?? '',
    testStepId: defect.testStepId ?? '',
    testStepNumber: defect.testStepNumber,
    externalSystem: defect.externalSystem ?? '',
    externalIssueKey: defect.externalIssueKey ?? '',
    externalIssueUrl: defect.externalIssueUrl ?? '',
    assigneeUserId: defect.assignee?.userId ?? '',
    reporterUserId: defect.reporter?.userId ?? '',
  };
}

export function buildDefectDraftFromExecution(
  execution: TestExecution,
  testCase: TestCase,
  stepResult?: StepExecutionResult,
): DefectFormValues {
  const sourceStep =
    stepResult ??
    execution.stepResults.find((step) => step.status === 'Failed') ??
    execution.stepResults.find((step) => step.status === 'Blocked');
  const contextTitle = sourceStep
    ? `${testCase.name} - ${sourceStep.stepDescription} ${sourceStep.status.toLocaleLowerCase()}`
    : `${testCase.name} - ${execution.overallStatus.toLocaleLowerCase()} execution`;

  return {
    ...EMPTY_DEFECT_FORM_VALUES,
    title: contextTitle,
    projectId: execution.projectId,
    scenarioId: execution.scenarioId,
    testCaseId: execution.testCaseId,
    executionId: execution.id,
    testStepId: sourceStep?.testStepId ?? '',
    testStepNumber: sourceStep?.stepNumber,
    expectedResult: sourceStep?.expectedResult ?? '',
    actualResult: sourceStep?.actualResult ?? '',
  };
}

export type DefectSortKey =
  | 'defectId'
  | 'title'
  | 'status'
  | 'severity'
  | 'priority'
  | 'createdDate'
  | 'updatedDate';

export type DefectFilters = {
  searchQuery: string;
  projectId: string;
  status: 'all' | DefectStatus;
  severity: 'all' | DefectSeverity;
  priority: 'all' | DefectPriority;
  assignee: string;
  externalSystem: 'all' | ExternalSystem;
  linkedToExecution: 'all' | 'yes' | 'no';
  externalIssueLinked: 'all' | 'yes' | 'no';
};

export const EMPTY_DEFECT_FILTERS: DefectFilters = {
  searchQuery: '',
  projectId: 'all',
  status: 'all',
  severity: 'all',
  priority: 'all',
  assignee: 'all',
  externalSystem: 'all',
  linkedToExecution: 'all',
  externalIssueLinked: 'all',
};

function matchesYesNoFilter(
  filter: 'all' | 'yes' | 'no',
  hasValue: boolean,
) {
  return filter === 'all' || (filter === 'yes' ? hasValue : !hasValue);
}

export function filterDefects(
  defects: readonly Defect[],
  filters: DefectFilters,
) {
  return defects.filter(
    (defect) =>
      matchesSearch(filters.searchQuery, [
        defect.defectId,
        defect.title,
        defect.description,
        defect.externalIssueKey,
      ]) &&
      (filters.projectId === 'all' ||
        defect.projectId === filters.projectId) &&
      (filters.status === 'all' || defect.status === filters.status) &&
      (filters.severity === 'all' ||
        defect.severity === filters.severity) &&
      (filters.priority === 'all' ||
        defect.priority === filters.priority) &&
      (filters.assignee === 'all' ||
        defect.assigneeName === filters.assignee) &&
      (filters.externalSystem === 'all' ||
        defect.externalSystem === filters.externalSystem) &&
      matchesYesNoFilter(
        filters.linkedToExecution,
        Boolean(defect.executionId),
      ) &&
      matchesYesNoFilter(
        filters.externalIssueLinked,
        Boolean(defect.externalIssueUrl),
      ),
  );
}

export function compareDefects(
  first: Defect,
  second: Defect,
  sortKey: DefectSortKey,
) {
  switch (sortKey) {
    case 'createdDate':
    case 'updatedDate':
      return compareDates(first[sortKey], second[sortKey]);
    default:
      return compareText(first[sortKey], second[sortKey]);
  }
}

const ACTIVE_DEFECT_STATUSES: readonly DefectStatus[] = [
  'Open',
  'In Progress',
  'Ready for Retest',
  'Reopened',
];

export type UnlinkedFailedTest = {
  testCase: TestCase;
  execution: TestExecution;
};

export function getFailedOrBlockedTestsWithoutActiveDefects(
  testCases: readonly TestCase[],
  executions: readonly TestExecution[],
  defects: readonly Defect[],
): UnlinkedFailedTest[] {
  const latestExecutions = getLatestExecutionsByTestCase(executions);

  return testCases.flatMap((testCase) => {
    const execution = latestExecutions.get(testCase.id);
    const hasActiveDefect = defects.some(
      (defect) =>
        defect.testCaseId === testCase.id &&
        ACTIVE_DEFECT_STATUSES.includes(defect.status),
    );

    return execution &&
      (execution.overallStatus === 'Failed' ||
        execution.overallStatus === 'Blocked') &&
      !hasActiveDefect
      ? [{ testCase, execution }]
      : [];
  });
}
