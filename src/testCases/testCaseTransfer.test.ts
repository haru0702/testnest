import { utils, write } from '@e965/xlsx';
import type { Project } from '../projects/project';
import type { TestCase, TestScenario } from './testCase';
import { parseTestCaseImportWorkbook } from './testCaseSpreadsheet';
import {
  TEST_CASE_IMPORT_COLUMNS,
  buildTestCaseExportRows,
  buildTestCaseImportPreview,
  createImportedTestCases,
  getTestCasesForExport,
  type TestCaseImportRow,
} from './testCaseTransfer';

const projects: Project[] = [
  {
    id: 'project-1',
    name: 'QA Platform',
    description: '',
    status: 'Active',
    createdDate: '2026-08-01T00:00:00.000Z',
    updatedDate: '2026-08-01T00:00:00.000Z',
  },
];

const scenarios: TestScenario[] = [
  {
    id: 'scenario-1',
    projectId: 'project-1',
    name: 'Login',
    description: '',
    createdDate: '2026-08-01T00:00:00.000Z',
    updatedDate: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'scenario-2',
    projectId: 'project-1',
    name: 'Checkout',
    description: '',
    createdDate: '2026-08-01T00:00:00.000Z',
    updatedDate: '2026-08-01T00:00:00.000Z',
  },
];

const existingTestCase: TestCase = {
  id: 'case-existing',
  projectId: 'project-1',
  scenarioId: 'scenario-1',
  name: 'Existing Case',
  description: '',
  precondition: '',
  steps: [
    { id: 'step-existing', description: 'Act', expectedResult: 'Success' },
  ],
  createdDate: '2026-08-01T00:00:00.000Z',
  updatedDate: '2026-08-01T00:00:00.000Z',
};

function importRow(
  overrides: Partial<TestCaseImportRow> = {},
): TestCaseImportRow {
  return {
    rowNumber: 2,
    projectName: 'QA Platform',
    scenarioName: 'Login',
    testCaseName: 'Valid Login',
    testDescription: 'Verify valid login',
    precondition: 'An active user exists',
    stepNumber: '1',
    stepDescription: 'Enter credentials',
    expectedResult: 'Credentials are accepted',
    ...overrides,
  };
}

function preview(
  rows: TestCaseImportRow[],
  existingTestCases: TestCase[] = [],
) {
  return buildTestCaseImportPreview(rows, {
    projects,
    scenarios,
    existingTestCases,
  });
}

async function workbookBuffer(
  rows: unknown[][],
  columns: readonly string[] = TEST_CASE_IMPORT_COLUMNS,
) {
  const workbook = utils.book_new();
  const worksheet = utils.aoa_to_sheet([[...columns], ...rows]);

  utils.book_append_sheet(workbook, worksheet, 'Test Cases');
  return write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

describe('Test Case import', () => {
  it('parses valid workbook rows and ignores blank rows', async () => {
    const buffer = await workbookBuffer([
      [
        'QA Platform',
        'Login',
        'Valid Login',
        '',
        '',
        1,
        'Enter user',
        'Accepted',
      ],
      [],
    ]);

    const result = await parseTestCaseImportWorkbook(buffer);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        projectName: 'QA Platform',
        stepNumber: '1',
        stepDescription: 'Enter user',
      }),
    ]);
  });

  it('reports missing columns and an empty workbook', async () => {
    const missingColumns = await parseTestCaseImportWorkbook(
      await workbookBuffer([], ['Project Name', 'Scenario Name'] as const),
    );
    const emptyWorkbook = utils.book_new();
    utils.book_append_sheet(
      emptyWorkbook,
      utils.aoa_to_sheet([]),
      'Test Cases',
    );
    const emptyBuffer = write(emptyWorkbook, {
      bookType: 'xlsx',
      type: 'array',
    }) as ArrayBuffer;

    expect(missingColumns.errors[0]).toContain('Missing required columns');
    await expect(parseTestCaseImportWorkbook(emptyBuffer)).resolves.toEqual({
      rows: [],
      errors: ['The workbook does not contain any Test Case rows.'],
    });
  });

  it('groups rows into one Test Case, orders steps, and trims whitespace', () => {
    const result = preview([
      importRow({
        rowNumber: 2,
        projectName: '  QA Platform  ',
        scenarioName: '  Login ',
        testCaseName: '  Valid Login  ',
        testDescription: '  Login coverage  ',
        stepNumber: '2',
        stepDescription: '  Submit form  ',
        expectedResult: '  Dashboard appears  ',
      }),
      importRow({
        rowNumber: 3,
        stepNumber: '1',
        stepDescription: '  Enter credentials  ',
        expectedResult: '  Credentials accepted  ',
      }),
    ]);

    expect(result).toMatchObject({
      testCasesDetected: 1,
      testStepsDetected: 2,
      validTestCases: 1,
    });
    expect(result.testCases[0]).toMatchObject({
      projectName: 'QA Platform',
      scenarioName: 'Login',
      testCaseName: 'Valid Login',
      testDescription: 'Login coverage',
      steps: [
        { stepNumber: 1, description: 'Enter credentials' },
        { stepNumber: 2, description: 'Submit form' },
      ],
    });
  });

  it('reports missing required fields', () => {
    const result = preview([
      importRow({
        projectName: ' ',
        scenarioName: '',
        testCaseName: '',
        stepNumber: '',
        stepDescription: '',
        expectedResult: '',
      }),
    ]);

    expect(result.invalidTestCases).toBe(1);
    expect(result.testCases[0].messages).toEqual(
      expect.arrayContaining([
        'Row 2: Project Name is required.',
        'Row 2: Scenario Name is required.',
        'Row 2: Test Case Name is required.',
        'Row 2: Step Number is required.',
        'Row 2: Step Description is required.',
        'Row 2: Expected Result is required.',
      ]),
    );
  });

  it('rejects an unknown Project', () => {
    const result = preview([importRow({ projectName: 'CAMP' })]);

    expect(result.invalidTestCases).toBe(1);
    expect(result.testCases[0].messages).toContain(
      'Row 2: Project "CAMP" does not exist.',
    );
  });

  it('rejects an unknown Scenario under an existing Project', () => {
    const result = preview([importRow({ scenarioName: 'Payments' })]);

    expect(result.invalidTestCases).toBe(1);
    expect(result.testCases[0].messages).toContain(
      'Row 2: Scenario "Payments" does not exist under Project "QA Platform".',
    );
  });

  it('marks an exact existing Test Case as a duplicate', () => {
    const result = preview(
      [importRow({ testCaseName: 'Existing Case' })],
      [existingTestCase],
    );

    expect(result.duplicateTestCases).toBe(1);
    expect(result.testCases[0].status).toBe('duplicate');
  });

  it('detects duplicate Test Cases case-insensitively within a Scenario', () => {
    const result = preview(
      [importRow({ testCaseName: '  EXISTING CASE  ' })],
      [existingTestCase],
    );

    expect(result.duplicateTestCases).toBe(1);
    expect(result.testCases[0].messages[0]).toContain(
      'already exists in Scenario "Login"',
    );
  });

  it('allows the same Test Case name in a different Scenario', () => {
    const result = preview(
      [importRow({ scenarioName: 'Checkout', testCaseName: 'Existing Case' })],
      [existingTestCase],
    );

    expect(result.validTestCases).toBe(1);
  });

  it('rejects duplicate Step Numbers', () => {
    const result = preview([
      importRow({ rowNumber: 2, stepNumber: '1' }),
      importRow({ rowNumber: 3, stepNumber: '1' }),
    ]);

    expect(result.invalidTestCases).toBe(1);
    expect(result.testCases[0].messages[0]).toContain(
      'Step Number 1 is duplicated',
    );
  });

  it.each(['0', '-1', '1.5', 'first'])(
    'rejects invalid Step Number %s',
    (stepNumber) => {
      const result = preview([importRow({ stepNumber })]);

      expect(result.invalidTestCases).toBe(1);
      expect(result.testCases[0].messages).toContain(
        'Row 2: Step Number must be a positive integer.',
      );
    },
  );

  it('rejects the whole Test Case when one step is invalid', () => {
    const result = preview([
      importRow({ rowNumber: 2, stepNumber: '1' }),
      importRow({
        rowNumber: 3,
        stepNumber: '2',
        expectedResult: '',
      }),
    ]);

    expect(result.validTestCases).toBe(0);
    expect(createImportedTestCases(result)).toEqual([]);
  });

  it('creates one Test Case with ordered TestStep records', () => {
    const result = preview([
      importRow({ rowNumber: 2, stepNumber: '2', stepDescription: 'Submit' }),
      importRow({ rowNumber: 3, stepNumber: '1', stepDescription: 'Enter' }),
    ]);
    let id = 0;
    const imported = createImportedTestCases(
      result,
      '2026-08-08T10:00:00.000Z',
      () => `id-${++id}`,
    );

    expect(imported).toHaveLength(1);
    expect(imported[0].steps.map((step) => step.description)).toEqual([
      'Enter',
      'Submit',
    ]);
  });
});

describe('Test Case export', () => {
  const exportCase: TestCase = {
    ...existingTestCase,
    id: 'case-export',
    name: 'Export Case',
    steps: [
      {
        id: 'step-1',
        description: 'First action',
        expectedResult: 'First result',
      },
      {
        id: 'step-2',
        description: 'Second action',
        expectedResult: 'Second result',
      },
    ],
  };

  it('generates one export row per Test Step', () => {
    const rows = buildTestCaseExportRows(
      [exportCase],
      projects,
      scenarios,
      new Map([['case-export', 'Passed']]),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      'Project Name': 'QA Platform',
      'Scenario Name': 'Login',
      'Test Case Name': 'Export Case',
      'Step Number': 1,
      'Step Description': 'First action',
      'Latest Execution Status': 'Passed',
    });
    expect(rows[1]['Step Number']).toBe(2);
  });

  it('selects every Test Case for Export All', () => {
    expect(
      getTestCasesForExport(
        [existingTestCase, exportCase],
        [exportCase],
        'all',
      ),
    ).toHaveLength(2);
  });

  it('selects only matching Test Cases for Export Filtered', () => {
    expect(
      getTestCasesForExport(
        [existingTestCase, exportCase],
        [exportCase],
        'filtered',
      ),
    ).toEqual([exportCase]);
  });
});
