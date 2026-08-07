import { PROJECT_STATUSES, type Project } from './project';

export const PROJECT_STORAGE_KEY = 'testnest.projects';

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
    typeof project.updatedDate === 'string'
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
