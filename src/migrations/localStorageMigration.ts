export type LocalStorageMigrationEntry = {
  storageKey: string;
  sourceModel: string;
  targetTables: string[];
  idStrategy: string;
  transformations: string[];
  relationships: string[];
};

export const LOCAL_STORAGE_MIGRATION_MAP: LocalStorageMigrationEntry[] = [
  {
    storageKey: 'testnest.users',
    sourceModel: 'User',
    targetTables: ['auth.users', 'profiles'],
    idStrategy: 'Map every local user ID to a Supabase Auth UUID; do not preserve local identity IDs.',
    transformations: [
      'firstName/lastName/displayName/createdDate/updatedDate become snake_case profile columns.',
      'Create Auth users through an approved Admin process; never migrate or invent passwords.',
    ],
    relationships: ['Use the ID map to replace every embedded UserReference.userId.'],
  },
  {
    storageKey: 'testnest.activeUserId',
    sourceModel: 'string',
    targetTables: [],
    idStrategy: 'Do not migrate.',
    transformations: ['Supabase Auth session state replaces the local active-user selection.'],
    relationships: [],
  },
  {
    storageKey: 'testnest.projects',
    sourceModel: 'Project',
    targetTables: ['projects'],
    idStrategy: 'Preserve valid UUIDs; generate and record replacements for legacy non-UUID IDs.',
    transformations: ['createdDate/updatedDate become created_at/updated_at.', 'createdBy/updatedBy snapshots become profile foreign keys through the user ID map.'],
    relationships: ['Record project ID replacements for scenarios, cases, executions, and defects.'],
  },
  {
    storageKey: 'testnest.scenarios',
    sourceModel: 'TestScenario',
    targetTables: ['test_scenarios'],
    idStrategy: 'Preserve valid UUIDs; map legacy IDs.',
    transformations: ['projectId and audit snapshots become foreign keys; dates become timestamptz columns.'],
    relationships: ['Resolve project_id before insert and record scenario mappings for child rows.'],
  },
  {
    storageKey: 'testnest.testCases',
    sourceModel: 'TestCase with embedded TestStep[]',
    targetTables: ['test_cases', 'test_steps'],
    idStrategy: 'Preserve valid case/step UUIDs; map legacy IDs.',
    transformations: ['Split each embedded steps array into ordered test_steps rows.', 'Use array position + 1 as step_number while preserving step IDs where valid.'],
    relationships: ['Resolve project_id and scenario_id, then map step IDs for execution results and defects.'],
  },
  {
    storageKey: 'testnest.executions',
    sourceModel: 'TestExecution with embedded StepExecutionResult[]',
    targetTables: ['test_executions', 'test_step_results'],
    idStrategy: 'Preserve valid execution UUIDs; map legacy IDs.',
    transformations: ['executionDate becomes executed_at and executedBy becomes executed_by.', 'Split stepResults into snapshot rows; retain description and expected-result text even when a source step changes.'],
    relationships: ['Resolve project, scenario, case, step, and profile mappings before insert.'],
  },
  {
    storageKey: 'testnest.defects',
    sourceModel: 'Defect',
    targetTables: ['defects'],
    idStrategy: 'Preserve valid UUIDs; map legacy IDs. Import the DEF-numeric suffix into defect_number when conflict-free.',
    transformations: ['Convert camelCase fields to snake_case.', 'Map assignee/reporter/audit snapshots to profiles and preserve external issue fields.'],
    relationships: ['Resolve all optional project, scenario, case, execution, step, and profile references through ID maps.'],
  },
] as const;
