import { PROJECT_STATUSES, type Project } from './project';
import type { UserReference } from '../users/user';

export const PROJECT_STORAGE_KEY = 'testnest.projects';

function isOptionalUserReference(value: unknown): value is UserReference | undefined {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const reference = value as Record<string, unknown>;
  return typeof reference.userId === 'string' && typeof reference.displayName === 'string';
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const project = value as Record<string, unknown>;

  return (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    typeof project.description === 'string' &&
    typeof project.status === 'string' &&
    PROJECT_STATUSES.includes(project.status as Project['status']) &&
    typeof project.createdDate === 'string' &&
    typeof project.updatedDate === 'string' &&
    isOptionalUserReference(project.createdBy) &&
    isOptionalUserReference(project.updatedBy)
  );
}

export function loadProjects(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
) {
  try {
    const storedProjects = storage.getItem(PROJECT_STORAGE_KEY);

    if (!storedProjects) {
      return [];
    }

    const parsedProjects: unknown = JSON.parse(storedProjects);

    return Array.isArray(parsedProjects) ? parsedProjects.filter(isProject) : [];
  } catch {
    return [];
  }
}

export function saveProjects(
  projects: readonly Project[],
  storage: Pick<Storage, 'setItem'> = window.localStorage,
) {
  storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
}
