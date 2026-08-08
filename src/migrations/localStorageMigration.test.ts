import { LOCAL_STORAGE_MIGRATION_MAP } from './localStorageMigration';

describe('Phase 10B localStorage migration map', () => {
  it('accounts for every current TestNest localStorage key', () => {
    expect(LOCAL_STORAGE_MIGRATION_MAP.map((entry) => entry.storageKey)).toEqual([
      'testnest.users',
      'testnest.activeUserId',
      'testnest.projects',
      'testnest.scenarios',
      'testnest.testCases',
      'testnest.executions',
      'testnest.defects',
    ]);
  });

  it('maps embedded test steps and execution results to relational tables', () => {
    expect(
      LOCAL_STORAGE_MIGRATION_MAP.find(
        (entry) => entry.storageKey === 'testnest.testCases',
      )?.targetTables,
    ).toContain('test_steps');
    expect(
      LOCAL_STORAGE_MIGRATION_MAP.find(
        (entry) => entry.storageKey === 'testnest.executions',
      )?.targetTables,
    ).toContain('test_step_results');
  });
});
