export const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdDate: string;
  updatedDate: string;
};

export type ProjectFormValues = Pick<
  Project,
  'name' | 'description' | 'status'
>;

export const PROJECT_NAME_REQUIRED_ERROR = 'Project Name is required.';
export const PROJECT_NAME_DUPLICATE_ERROR =
  'A project with this name already exists.';

export function normalizeProjectName(name: string) {
  return name.trim();
}

export function getProjectNameError(
  name: string,
  projects: readonly Project[],
  excludedProjectId?: string,
) {
  const normalizedName = normalizeProjectName(name);

  if (!normalizedName) {
    return PROJECT_NAME_REQUIRED_ERROR;
  }

  const comparableName = normalizedName.toLocaleLowerCase();
  const isDuplicate = projects.some(
    (project) =>
      project.id !== excludedProjectId &&
      normalizeProjectName(project.name).toLocaleLowerCase() === comparableName,
  );

  return isDuplicate ? PROJECT_NAME_DUPLICATE_ERROR : null;
}
