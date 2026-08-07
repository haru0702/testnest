import {
  PROJECT_NAME_DUPLICATE_ERROR,
  PROJECT_NAME_REQUIRED_ERROR,
  getProjectNameError,
  normalizeProjectName,
  type Project,
} from './project';

const existingProject: Project = {
  id: 'project-1',
  name: 'Customer Portal',
  description: 'Regression coverage for the customer portal.',
  status: 'Active',
  createdDate: '2026-08-08T00:00:00.000Z',
  updatedDate: '2026-08-08T00:00:00.000Z',
};

describe('project name rules', () => {
  it('requires a project name', () => {
    expect(getProjectNameError('   ', [])).toBe(
      PROJECT_NAME_REQUIRED_ERROR,
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeProjectName('  Customer Portal  ')).toBe(
      'Customer Portal',
    );
  });

  it('prevents duplicate project names', () => {
    expect(getProjectNameError('Customer Portal', [existingProject])).toBe(
      PROJECT_NAME_DUPLICATE_ERROR,
    );
  });

  it('checks duplicates without considering case or surrounding whitespace', () => {
    expect(getProjectNameError('  customer portal  ', [existingProject])).toBe(
      PROJECT_NAME_DUPLICATE_ERROR,
    );
  });

  it('allows an edited project to keep its current name', () => {
    expect(
      getProjectNameError(
        'Customer Portal',
        [existingProject],
        existingProject.id,
      ),
    ).toBeNull();
  });
});
