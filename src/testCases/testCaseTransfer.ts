import type { ExecutionStatus } from '../executions/execution';
import type { Project } from '../projects/project';
import type { TestCase, TestScenario } from './testCase';

export const TEST_CASE_IMPORT_COLUMNS = [
  'Project Name',
  'Scenario Name',
  'Test Case Name',
  'Test Description',
  'Precondition',
  'Step Number',
  'Step Description',
  'Expected Result',
] as const;

export const TEST_CASE_EXPORT_COLUMNS = [
  'Project Name',
  'Scenario Name',
  'Test Case ID',
  'Test Case Name',
  'Test Description',
  'Precondition',
  'Step Number',
  'Step Description',
  'Expected Result',
  'Latest Execution Status',
  'Created Date',
  'Updated Date',
] as const;

export type TestCaseImportRow = {
  rowNumber: number;
  projectName: string;
  scenarioName: string;
  testCaseName: string;
  testDescription: string;
  precondition: string;
  stepNumber: string;
  stepDescription: string;
  expectedResult: string;
};

export type ImportTestStepPreview = {
  rowNumber: number;
  stepNumber: number;
  description: string;
  expectedResult: string;
};

export type ImportPreviewStatus = 'valid' | 'duplicate' | 'invalid';

export type ImportTestCasePreview = {
  key: string;
  projectId?: string;
  scenarioId?: string;
  projectName: string;
  scenarioName: string;
  testCaseName: string;
  testDescription: string;
  precondition: string;
  rowNumbers: number[];
  steps: ImportTestStepPreview[];
  status: ImportPreviewStatus;
  messages: string[];
};

export type TestCaseImportPreview = {
  testCases: ImportTestCasePreview[];
  testCasesDetected: number;
  testStepsDetected: number;
  validTestCases: number;
  duplicateTestCases: number;
  invalidTestCases: number;
};

export type TestCaseExportRow = {
  'Project Name': string;
  'Scenario Name': string;
  'Test Case ID': string;
  'Test Case Name': string;
  'Test Description': string;
  Precondition: string;
  'Step Number': number;
  'Step Description': string;
  'Expected Result': string;
  'Latest Execution Status': ExecutionStatus;
  'Created Date': string;
  'Updated Date': string;
};

type ImportContext = {
  projects: readonly Project[];
  scenarios: readonly TestScenario[];
  existingTestCases: readonly TestCase[];
};

function normalize(value: string) {
  return value.trim();
}

function comparable(value: string) {
  return normalize(value).toLocaleLowerCase();
}

function formatRowNumbers(rowNumbers: readonly number[]) {
  const sortedRows = [...rowNumbers].sort((first, second) => first - second);

  if (sortedRows.length === 1) {
    return `Row ${sortedRows[0]}`;
  }

  const isConsecutive = sortedRows.every(
    (rowNumber, index) =>
      index === 0 || rowNumber === sortedRows[index - 1] + 1,
  );

  return isConsecutive
    ? `Rows ${sortedRows[0]}-${sortedRows[sortedRows.length - 1]}`
    : `Rows ${sortedRows.join(', ')}`;
}

function groupImportRows(rows: readonly TestCaseImportRow[]) {
  const groups = new Map<string, TestCaseImportRow[]>();

  rows.forEach((row) => {
    const key = [row.projectName, row.scenarioName, row.testCaseName]
      .map(comparable)
      .join('\u0000');
    const currentRows = groups.get(key) ?? [];

    groups.set(key, [...currentRows, row]);
  });

  return groups;
}

export function buildTestCaseImportPreview(
  rows: readonly TestCaseImportRow[],
  context: ImportContext,
): TestCaseImportPreview {
  const groupedRows = groupImportRows(rows);
  const testCases = [...groupedRows.entries()].map(([key, groupRows]) => {
    const firstRow = groupRows[0];
    const projectName = normalize(firstRow.projectName);
    const scenarioName = normalize(firstRow.scenarioName);
    const testCaseName = normalize(firstRow.testCaseName);
    const project = context.projects.find(
      (candidate) => comparable(candidate.name) === comparable(projectName),
    );
    const scenario = project
      ? context.scenarios.find(
          (candidate) =>
            candidate.projectId === project.id &&
            comparable(candidate.name) === comparable(scenarioName),
        )
      : undefined;
    const messages: string[] = [];
    const steps: ImportTestStepPreview[] = [];

    groupRows.forEach((row) => {
      const rowLabel = `Row ${row.rowNumber}`;
      const normalizedProjectName = normalize(row.projectName);
      const normalizedScenarioName = normalize(row.scenarioName);
      const normalizedTestCaseName = normalize(row.testCaseName);
      const rowProject = context.projects.find(
        (candidate) =>
          comparable(candidate.name) === comparable(normalizedProjectName),
      );
      const rowScenario = rowProject
        ? context.scenarios.find(
            (candidate) =>
              candidate.projectId === rowProject.id &&
              comparable(candidate.name) === comparable(normalizedScenarioName),
          )
        : undefined;

      if (!normalizedProjectName) {
        messages.push(`${rowLabel}: Project Name is required.`);
      } else if (!rowProject) {
        messages.push(
          `${rowLabel}: Project "${normalizedProjectName}" does not exist.`,
        );
      }

      if (!normalizedScenarioName) {
        messages.push(`${rowLabel}: Scenario Name is required.`);
      } else if (rowProject && !rowScenario) {
        messages.push(
          `${rowLabel}: Scenario "${normalizedScenarioName}" does not exist under Project "${normalizedProjectName}".`,
        );
      }

      if (!normalizedTestCaseName) {
        messages.push(`${rowLabel}: Test Case Name is required.`);
      }

      const normalizedStepNumber = normalize(row.stepNumber);
      const stepNumber = Number(normalizedStepNumber);

      if (!normalizedStepNumber) {
        messages.push(`${rowLabel}: Step Number is required.`);
      } else if (!Number.isInteger(stepNumber) || stepNumber <= 0) {
        messages.push(`${rowLabel}: Step Number must be a positive integer.`);
      }

      const stepDescription = normalize(row.stepDescription);
      const expectedResult = normalize(row.expectedResult);

      if (!stepDescription) {
        messages.push(`${rowLabel}: Step Description is required.`);
      }

      if (!expectedResult) {
        messages.push(`${rowLabel}: Expected Result is required.`);
      }

      if (
        normalizedStepNumber &&
        Number.isInteger(stepNumber) &&
        stepNumber > 0
      ) {
        steps.push({
          rowNumber: row.rowNumber,
          stepNumber,
          description: stepDescription,
          expectedResult,
        });
      }
    });

    const rowsByStepNumber = new Map<number, number[]>();

    steps.forEach((step) => {
      rowsByStepNumber.set(step.stepNumber, [
        ...(rowsByStepNumber.get(step.stepNumber) ?? []),
        step.rowNumber,
      ]);
    });

    rowsByStepNumber.forEach((rowNumbers, stepNumber) => {
      if (rowNumbers.length > 1) {
        messages.push(
          `${formatRowNumbers(rowNumbers)}: Step Number ${stepNumber} is duplicated within Test Case "${testCaseName}".`,
        );
      }
    });

    const duplicate =
      scenario &&
      testCaseName &&
      context.existingTestCases.some(
        (testCase) =>
          testCase.scenarioId === scenario.id &&
          comparable(testCase.name) === comparable(testCaseName),
      );

    let status: ImportPreviewStatus = messages.length > 0 ? 'invalid' : 'valid';

    if (status === 'valid' && duplicate) {
      status = 'duplicate';
      messages.push(
        `${formatRowNumbers(groupRows.map((row) => row.rowNumber))}: Test Case "${testCaseName}" already exists in Scenario "${scenarioName}".`,
      );
    }

    return {
      key,
      projectId: project?.id,
      scenarioId: scenario?.id,
      projectName,
      scenarioName,
      testCaseName,
      testDescription: normalize(firstRow.testDescription),
      precondition: normalize(firstRow.precondition),
      rowNumbers: groupRows.map((row) => row.rowNumber),
      steps: steps.sort(
        (first, second) => first.stepNumber - second.stepNumber,
      ),
      status,
      messages: [...new Set(messages)],
    };
  });

  return {
    testCases,
    testCasesDetected: testCases.length,
    testStepsDetected: rows.length,
    validTestCases: testCases.filter((testCase) => testCase.status === 'valid')
      .length,
    duplicateTestCases: testCases.filter(
      (testCase) => testCase.status === 'duplicate',
    ).length,
    invalidTestCases: testCases.filter(
      (testCase) => testCase.status === 'invalid',
    ).length,
  };
}

export function createImportedTestCases(
  preview: TestCaseImportPreview,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID(),
) {
  return preview.testCases
    .filter(
      (
        testCase,
      ): testCase is ImportTestCasePreview & {
        projectId: string;
        scenarioId: string;
      } =>
        testCase.status === 'valid' &&
        Boolean(testCase.projectId) &&
        Boolean(testCase.scenarioId),
    )
    .map<TestCase>((testCase) => ({
      id: createId(),
      name: testCase.testCaseName,
      description: testCase.testDescription,
      precondition: testCase.precondition,
      projectId: testCase.projectId,
      scenarioId: testCase.scenarioId,
      steps: testCase.steps.map((step) => ({
        id: createId(),
        description: step.description,
        expectedResult: step.expectedResult,
      })),
      createdDate: now,
      updatedDate: now,
    }));
}

export function getTestCasesForExport(
  allTestCases: readonly TestCase[],
  filteredTestCases: readonly TestCase[],
  mode: 'all' | 'filtered',
) {
  return [...(mode === 'all' ? allTestCases : filteredTestCases)];
}

export function buildTestCaseExportRows(
  testCases: readonly TestCase[],
  projects: readonly Project[],
  scenarios: readonly TestScenario[],
  latestStatuses: ReadonlyMap<string, ExecutionStatus>,
) {
  const projectNames = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const scenarioNames = new Map(
    scenarios.map((scenario) => [scenario.id, scenario.name]),
  );

  return testCases.flatMap<TestCaseExportRow>((testCase) =>
    testCase.steps.map((step, index) => ({
      'Project Name': projectNames.get(testCase.projectId) ?? '',
      'Scenario Name': scenarioNames.get(testCase.scenarioId) ?? '',
      'Test Case ID': testCase.id,
      'Test Case Name': testCase.name,
      'Test Description': testCase.description,
      Precondition: testCase.precondition,
      'Step Number': index + 1,
      'Step Description': step.description,
      'Expected Result': step.expectedResult,
      'Latest Execution Status': latestStatuses.get(testCase.id) ?? 'No Run',
      'Created Date': testCase.createdDate,
      'Updated Date': testCase.updatedDate,
    })),
  );
}
