import {
  DEFECT_PRIORITIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  EXTERNAL_SYSTEMS,
  type Defect,
  type DefectPriority,
  type DefectSeverity,
  type DefectStatus,
  type ExternalSystem,
} from './defect';
import type { UserReference } from '../users/user';

export const DEFECT_STORAGE_KEY = 'testnest.defects';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown) {
  return value === undefined || isString(value);
}

function isOptionalUserReference(value: unknown): value is UserReference | undefined {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const reference = value as Record<string, unknown>;
  return isString(reference.userId) && isString(reference.displayName);
}

function isDefect(value: unknown): value is Defect {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const defect = value as Record<string, unknown>;

  return (
    isString(defect.id) &&
    isString(defect.defectId) &&
    isString(defect.title) &&
    isString(defect.description) &&
    isString(defect.stepsToReproduce) &&
    isString(defect.expectedResult) &&
    isString(defect.actualResult) &&
    DEFECT_STATUSES.includes(defect.status as DefectStatus) &&
    DEFECT_SEVERITIES.includes(defect.severity as DefectSeverity) &&
    DEFECT_PRIORITIES.includes(defect.priority as DefectPriority) &&
    isString(defect.assigneeName) &&
    isString(defect.reporterName) &&
    isOptionalUserReference(defect.assignee) &&
    isOptionalUserReference(defect.reporter) &&
    isOptionalString(defect.projectId) &&
    isOptionalString(defect.scenarioId) &&
    isOptionalString(defect.testCaseId) &&
    isOptionalString(defect.executionId) &&
    isOptionalString(defect.testStepId) &&
    (defect.testStepNumber === undefined ||
      typeof defect.testStepNumber === 'number') &&
    (defect.externalSystem === undefined ||
      EXTERNAL_SYSTEMS.includes(defect.externalSystem as ExternalSystem)) &&
    isOptionalString(defect.externalIssueKey) &&
    isOptionalString(defect.externalIssueUrl) &&
    isString(defect.createdDate) &&
    isString(defect.updatedDate) &&
    isOptionalUserReference(defect.createdBy) &&
    isOptionalUserReference(defect.updatedBy)
  );
}

export function loadDefects(
  storage: ReadStorage = window.localStorage,
): Defect[] {
  try {
    const storedDefects = storage.getItem(DEFECT_STORAGE_KEY);

    if (!storedDefects) {
      return [];
    }

    const parsedDefects: unknown = JSON.parse(storedDefects);
    return Array.isArray(parsedDefects) ? parsedDefects.filter(isDefect) : [];
  } catch {
    return [];
  }
}

export function saveDefects(
  defects: readonly Defect[],
  storage: WriteStorage = window.localStorage,
) {
  storage.setItem(DEFECT_STORAGE_KEY, JSON.stringify(defects));
}
