import type { WorkBook, WorkSheet } from '@e965/xlsx';
import {
  TEST_CASE_EXPORT_COLUMNS,
  TEST_CASE_IMPORT_COLUMNS,
  type TestCaseExportRow,
  type TestCaseImportRow,
} from './testCaseTransfer';

export type TestCaseImportParseResult = {
  rows: TestCaseImportRow[];
  errors: string[];
};

type SpreadsheetModule = typeof import('@e965/xlsx');

function normalizedHeader(value: string) {
  return value.trim().toLocaleLowerCase();
}

function cellText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function workbookBytes(write: SpreadsheetModule['write'], workbook: WorkBook) {
  return write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    compression: true,
  }) as ArrayBuffer;
}

function createSheet(
  utils: SpreadsheetModule['utils'],
  rows: unknown[][],
  widths: number[],
) {
  const worksheet = utils.aoa_to_sheet(rows);

  worksheet['!cols'] = widths.map((width) => ({ wch: width }));
  return worksheet;
}

function addSheet(
  utils: SpreadsheetModule['utils'],
  workbook: WorkBook,
  worksheet: WorkSheet,
  name: string,
) {
  utils.book_append_sheet(workbook, worksheet, name);
}

export async function parseTestCaseImportWorkbook(
  data: ArrayBuffer,
): Promise<TestCaseImportParseResult> {
  const { read, utils } = await import('@e965/xlsx');
  const workbook = read(data, { type: 'array' });
  const worksheetName = workbook.SheetNames.includes('Test Cases')
    ? 'Test Cases'
    : workbook.SheetNames[0];
  const worksheet = worksheetName ? workbook.Sheets[worksheetName] : undefined;

  if (!worksheet) {
    return {
      rows: [],
      errors: ['The workbook does not contain a worksheet.'],
    };
  }

  const worksheetRows = utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  });

  if (
    worksheetRows.length === 0 ||
    worksheetRows.every((row) => row.every((value) => !cellText(value)))
  ) {
    return {
      rows: [],
      errors: ['The workbook does not contain any Test Case rows.'],
    };
  }

  const headerColumns = new Map<string, number>();

  worksheetRows[0]?.forEach((value, columnIndex) => {
    const header = normalizedHeader(cellText(value));

    if (header) {
      headerColumns.set(header, columnIndex);
    }
  });

  const missingColumns = TEST_CASE_IMPORT_COLUMNS.filter(
    (column) => !headerColumns.has(normalizedHeader(column)),
  );

  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}.`],
    };
  }

  function value(
    row: unknown[],
    column: (typeof TEST_CASE_IMPORT_COLUMNS)[number],
  ) {
    return cellText(row[headerColumns.get(normalizedHeader(column))!]);
  }

  const rows = worksheetRows
    .slice(1)
    .flatMap<TestCaseImportRow>((worksheetRow, rowIndex) => {
      const values = TEST_CASE_IMPORT_COLUMNS.map((column) =>
        value(worksheetRow, column),
      );

      if (values.every((cellValue) => !cellValue)) {
        return [];
      }

      return [
        {
          rowNumber: rowIndex + 2,
          projectName: value(worksheetRow, 'Project Name'),
          scenarioName: value(worksheetRow, 'Scenario Name'),
          testCaseName: value(worksheetRow, 'Test Case Name'),
          testDescription: value(worksheetRow, 'Test Description'),
          precondition: value(worksheetRow, 'Precondition'),
          stepNumber: value(worksheetRow, 'Step Number'),
          stepDescription: value(worksheetRow, 'Step Description'),
          expectedResult: value(worksheetRow, 'Expected Result'),
        },
      ];
    });

  return rows.length > 0
    ? { rows, errors: [] }
    : {
        rows: [],
        errors: ['The workbook does not contain any Test Case rows.'],
      };
}

export async function createTestCaseImportTemplate() {
  const { utils, write } = await import('@e965/xlsx');
  const workbook = utils.book_new();
  const testCasesSheet = createSheet(
    utils,
    [
      [...TEST_CASE_IMPORT_COLUMNS],
      [
        'Project A',
        'Login',
        'Valid Login',
        'Verify a user can log in with valid credentials',
        'The user has an active account',
        1,
        'Enter a valid username',
        'The username is accepted',
      ],
      [
        'Project A',
        'Login',
        'Valid Login',
        'Verify a user can log in with valid credentials',
        'The user has an active account',
        2,
        'Enter a valid password and submit',
        'The user is redirected to the Dashboard',
      ],
    ],
    [24, 24, 24, 34, 24, 14, 28, 34],
  );
  testCasesSheet['!autofilter'] = { ref: 'A1:H3' };
  addSheet(utils, workbook, testCasesSheet, 'Test Cases');

  addSheet(
    utils,
    workbook,
    createSheet(
      utils,
      [
        ['TestNest Test Case Import Instructions'],
        [
          'Project Name, Scenario Name, Test Case Name, Step Number, Step Description, and Expected Result are required.',
        ],
        [
          'Projects and scenarios must already exist in TestNest. Missing records are not created automatically.',
        ],
        [
          'Use one Excel row per test step and repeat the Test Case fields for every row.',
        ],
        [
          'Test Case names must be unique within a scenario; comparison is case-insensitive.',
        ],
        [
          'Step Number must be a positive integer and unique within each Test Case.',
        ],
      ],
      [110],
    ),
    'Instructions',
  );

  return workbookBytes(write, workbook);
}

export async function createTestCaseExportWorkbook(
  rows: readonly TestCaseExportRow[],
) {
  const { utils, write } = await import('@e965/xlsx');
  const workbook = utils.book_new();
  const worksheet = createSheet(
    utils,
    [
      [...TEST_CASE_EXPORT_COLUMNS],
      ...rows.map((row) =>
        TEST_CASE_EXPORT_COLUMNS.map((column) => row[column]),
      ),
    ],
    [23, 23, 23, 23, 34, 23, 14, 34, 34, 23, 23, 23],
  );
  worksheet['!autofilter'] = {
    ref: `A1:L${Math.max(rows.length + 1, 1)}`,
  };
  addSheet(utils, workbook, worksheet, 'Test Cases');

  return workbookBytes(write, workbook);
}

export function downloadXlsx(data: ArrayBuffer, fileName: string) {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
