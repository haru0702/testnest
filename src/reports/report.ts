import {
  DEFECT_PRIORITIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  getFailedOrBlockedTestsWithoutActiveDefects,
  type Defect,
  type DefectPriority,
  type DefectSeverity,
  type DefectStatus,
} from '../defects/defect';
import {
  EXECUTION_STATUSES,
  getLatestExecutionsByTestCase,
  type ExecutionStatus,
  type ExecutionStatusCounts,
  type TestExecution,
} from '../executions/execution';
import type { Project } from '../projects/project';
import type { TestCase, TestScenario } from '../testCases/testCase';

export type ReportData = {
  projects: readonly Project[];
  scenarios: readonly TestScenario[];
  testCases: readonly TestCase[];
  executions: readonly TestExecution[];
  defects: readonly Defect[];
};

export type ReportFilters = {
  projectId: string;
  scenarioId: string;
  fromDate: string;
  toDate: string;
  executionStatus: 'all' | ExecutionStatus;
  defectStatus: 'all' | DefectStatus;
  severity: 'all' | DefectSeverity;
  priority: 'all' | DefectPriority;
  executedByUserId: string;
  defectAssigneeUserId: string;
  defectReporterUserId: string;
};

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  projectId: 'all',
  scenarioId: 'all',
  fromDate: '',
  toDate: '',
  executionStatus: 'all',
  defectStatus: 'all',
  severity: 'all',
  priority: 'all',
  executedByUserId: 'all',
  defectAssigneeUserId: 'all',
  defectReporterUserId: 'all',
};

export const INVALID_DATE_RANGE_ERROR =
  'From Date must be on or before To Date.';

export function getDateRangeError(filters: Pick<ReportFilters, 'fromDate' | 'toDate'>) {
  return filters.fromDate && filters.toDate && filters.fromDate > filters.toDate
    ? INVALID_DATE_RANGE_ERROR
    : null;
}

function isWithinDateRange(value: string, fromDate: string, toDate: string) {
  const date = value.slice(0, 10);
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
}

function matchesContext(
  item: { projectId: string; scenarioId?: string },
  filters: ReportFilters,
) {
  return (
    (filters.projectId === 'all' || item.projectId === filters.projectId) &&
    (filters.scenarioId === 'all' || item.scenarioId === filters.scenarioId)
  );
}

export type FilteredReportData = {
  projects: Project[];
  scenarios: TestScenario[];
  testCases: TestCase[];
  executions: TestExecution[];
  defects: Defect[];
  latestExecutions: Map<string, TestExecution>;
};

export function filterReportData(
  data: ReportData,
  filters: ReportFilters,
): FilteredReportData {
  const selectedScenario = data.scenarios.find(
    (scenario) => scenario.id === filters.scenarioId,
  );
  const projects = data.projects.filter(
    (project) =>
      (filters.projectId === 'all' || project.id === filters.projectId) &&
      (!selectedScenario || project.id === selectedScenario.projectId),
  );
  const scenarios = data.scenarios.filter(
    (scenario) =>
      (filters.projectId === 'all' ||
        scenario.projectId === filters.projectId) &&
      (filters.scenarioId === 'all' || scenario.id === filters.scenarioId),
  );
  const contextualTestCases = data.testCases.filter((testCase) =>
    matchesContext(testCase, filters),
  );
  const executions = data.executions.filter(
    (execution) =>
      matchesContext(execution, filters) &&
      isWithinDateRange(
        execution.executionDate,
        filters.fromDate,
        filters.toDate,
      ) &&
      (filters.executedByUserId === 'all' ||
        execution.executedBy?.userId === filters.executedByUserId),
  );
  const latestExecutions = getLatestExecutionsByTestCase(executions);
  const testCases = contextualTestCases.filter((testCase) => {
    if (filters.executionStatus === 'all') {
      return true;
    }

    return (
      latestExecutions.get(testCase.id)?.overallStatus ?? 'No Run'
    ) === filters.executionStatus;
  });
  const testCaseIds = new Set(testCases.map((testCase) => testCase.id));
  const defects = data.defects.filter(
    (defect) =>
      (filters.projectId === 'all' || defect.projectId === filters.projectId) &&
      (filters.scenarioId === 'all' ||
        defect.scenarioId === filters.scenarioId) &&
      isWithinDateRange(defect.createdDate, filters.fromDate, filters.toDate) &&
      (filters.executionStatus === 'all' ||
        Boolean(defect.testCaseId && testCaseIds.has(defect.testCaseId))) &&
      (filters.defectStatus === 'all' ||
        defect.status === filters.defectStatus) &&
      (filters.severity === 'all' || defect.severity === filters.severity) &&
      (filters.priority === 'all' || defect.priority === filters.priority) &&
      (filters.defectAssigneeUserId === 'all' ||
        defect.assignee?.userId === filters.defectAssigneeUserId) &&
      (filters.defectReporterUserId === 'all' ||
        defect.reporter?.userId === filters.defectReporterUserId),
  );

  return {
    projects: [...projects],
    scenarios: [...scenarios],
    testCases,
    executions,
    defects,
    latestExecutions,
  };
}

export function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export type ExecutionSummary = {
  totalTestCases: number;
  counts: ExecutionStatusCounts;
  percentages: ExecutionStatusCounts;
  executedTestCases: number;
  completionPercentage: number;
};

export function getExecutionSummary(
  testCases: readonly Pick<TestCase, 'id'>[],
  executions: readonly TestExecution[],
): ExecutionSummary {
  const latestExecutions = getLatestExecutionsByTestCase(executions);
  const counts: ExecutionStatusCounts = {
    Passed: 0,
    Failed: 0,
    Blocked: 0,
    'No Run': 0,
  };

  testCases.forEach((testCase) => {
    const status = latestExecutions.get(testCase.id)?.overallStatus ?? 'No Run';
    counts[status] += 1;
  });

  const totalTestCases = testCases.length;
  const executedTestCases = counts.Passed + counts.Failed + counts.Blocked;

  return {
    totalTestCases,
    counts,
    percentages: {
      Passed: percentage(counts.Passed, totalTestCases),
      Failed: percentage(counts.Failed, totalTestCases),
      Blocked: percentage(counts.Blocked, totalTestCases),
      'No Run': percentage(counts['No Run'], totalTestCases),
    },
    executedTestCases,
    completionPercentage: percentage(executedTestCases, totalTestCases),
  };
}

export type DefectSummary = {
  total: number;
  statuses: Record<DefectStatus, number>;
  severities: Record<DefectSeverity, number>;
  priorities: Record<DefectPriority, number>;
};

export function getDefectSummary(defects: readonly Defect[]): DefectSummary {
  const statuses = Object.fromEntries(
    DEFECT_STATUSES.map((status) => [status, 0]),
  ) as Record<DefectStatus, number>;
  const severities = Object.fromEntries(
    DEFECT_SEVERITIES.map((severity) => [severity, 0]),
  ) as Record<DefectSeverity, number>;
  const priorities = Object.fromEntries(
    DEFECT_PRIORITIES.map((priority) => [priority, 0]),
  ) as Record<DefectPriority, number>;

  defects.forEach((defect) => {
    statuses[defect.status] += 1;
    severities[defect.severity] += 1;
    priorities[defect.priority] += 1;
  });

  return { total: defects.length, statuses, severities, priorities };
}

export type ExecutionBreakdownRow = {
  id: string;
  project: string;
  scenario?: string;
  totalTestCases: number;
  Passed: number;
  Failed: number;
  Blocked: number;
  'No Run': number;
  executionPercentage: number;
};

export function getExecutionByProject(
  data: Pick<FilteredReportData, 'projects' | 'testCases' | 'executions'>,
) {
  return data.projects.map<ExecutionBreakdownRow>((project) => {
    const testCases = data.testCases.filter(
      (testCase) => testCase.projectId === project.id,
    );
    const summary = getExecutionSummary(testCases, data.executions);

    return {
      id: project.id,
      project: project.name,
      totalTestCases: summary.totalTestCases,
      ...summary.counts,
      executionPercentage: summary.completionPercentage,
    };
  });
}

export function getExecutionByScenario(
  data: Pick<
    FilteredReportData,
    'projects' | 'scenarios' | 'testCases' | 'executions'
  >,
) {
  const projectNames = new Map(
    data.projects.map((project) => [project.id, project.name]),
  );

  return data.scenarios.map<ExecutionBreakdownRow>((scenario) => {
    const testCases = data.testCases.filter(
      (testCase) => testCase.scenarioId === scenario.id,
    );
    const summary = getExecutionSummary(testCases, data.executions);

    return {
      id: scenario.id,
      project: projectNames.get(scenario.projectId) ?? 'Unknown Project',
      scenario: scenario.name,
      totalTestCases: summary.totalTestCases,
      ...summary.counts,
      executionPercentage: summary.completionPercentage,
    };
  });
}

export type DefectByProjectRow = {
  id: string;
  project: string;
  total: number;
  Open: number;
  'In Progress': number;
  'Ready for Retest': number;
  Closed: number;
  Reopened: number;
  Critical: number;
  High: number;
};

export function getDefectsByProject(
  projects: readonly Project[],
  defects: readonly Defect[],
) {
  return projects.map<DefectByProjectRow>((project) => {
    const summary = getDefectSummary(
      defects.filter((defect) => defect.projectId === project.id),
    );

    return {
      id: project.id,
      project: project.name,
      total: summary.total,
      ...summary.statuses,
      Critical: summary.severities.Critical,
      High: summary.severities.High,
    };
  });
}

export type CategoryCountRow = {
  category: string;
  count: number;
  percentage: number;
};

export function getDefectsByStatus(defects: readonly Defect[]) {
  const summary = getDefectSummary(defects);
  return DEFECT_STATUSES.map<CategoryCountRow>((status) => ({
    category: status,
    count: summary.statuses[status],
    percentage: percentage(summary.statuses[status], summary.total),
  }));
}

export function getDefectsBySeverity(defects: readonly Defect[]) {
  const summary = getDefectSummary(defects);
  return DEFECT_SEVERITIES.map<CategoryCountRow>((severity) => ({
    category: severity,
    count: summary.severities[severity],
    percentage: percentage(summary.severities[severity], summary.total),
  }));
}

export function getDefectsByPriority(defects: readonly Defect[]) {
  const summary = getDefectSummary(defects);
  return DEFECT_PRIORITIES.map<CategoryCountRow>((priority) => ({
    category: priority,
    count: summary.priorities[priority],
    percentage: percentage(summary.priorities[priority], summary.total),
  }));
}

export type TraceabilityFilters = {
  hasDefect: 'all' | 'yes' | 'no';
  hasExternalIssue: 'all' | 'yes' | 'no';
};

export const EMPTY_TRACEABILITY_FILTERS: TraceabilityFilters = {
  hasDefect: 'all',
  hasExternalIssue: 'all',
};

export type TraceabilityRow = {
  id: string;
  project: string;
  scenario: string;
  testCase: string;
  latestStatus: ExecutionStatus;
  latestExecution: string;
  latestExecutionDate: string;
  executedBy: string;
  defectId: string;
  defectStatus: string;
  severity: string;
  externalSystem: string;
  externalIssueKey: string;
  defectAssignee: string;
  defectReporter: string;
};

export function getTraceabilityRows(
  data: Pick<
    FilteredReportData,
    | 'projects'
    | 'scenarios'
    | 'testCases'
    | 'defects'
    | 'latestExecutions'
  >,
  filters: TraceabilityFilters = EMPTY_TRACEABILITY_FILTERS,
) {
  const projectNames = new Map(
    data.projects.map((project) => [project.id, project.name]),
  );
  const scenarioNames = new Map(
    data.scenarios.map((scenario) => [scenario.id, scenario.name]),
  );

  return data.testCases.flatMap<TraceabilityRow>((testCase) => {
    const latestExecution = data.latestExecutions.get(testCase.id);
    const linkedDefects = data.defects.filter(
      (defect) => defect.testCaseId === testCase.id,
    );
    const rows = (linkedDefects.length > 0 ? linkedDefects : [null]).map(
      (defect, index): TraceabilityRow => ({
        id: `${testCase.id}-${defect?.id ?? `none-${index}`}`,
        project:
          projectNames.get(testCase.projectId) ?? 'Unknown Project',
        scenario:
          scenarioNames.get(testCase.scenarioId) ?? 'Unknown Scenario',
        testCase: testCase.name,
        latestStatus: latestExecution?.overallStatus ?? 'No Run',
        latestExecution: latestExecution
          ? `EX-${latestExecution.id.slice(0, 8).toLocaleUpperCase()}`
          : 'Not executed',
        latestExecutionDate: latestExecution?.executionDate ?? '',
        executedBy: latestExecution?.executedBy?.displayName ?? 'Legacy Record',
        defectId: defect?.defectId ?? '',
        defectStatus: defect?.status ?? '',
        severity: defect?.severity ?? '',
        externalSystem: defect?.externalSystem ?? '',
        externalIssueKey: defect?.externalIssueKey ?? '',
        defectAssignee: defect?.assignee?.displayName ?? defect?.assigneeName ?? '',
        defectReporter: defect?.reporter?.displayName ?? defect?.reporterName ?? '',
      }),
    );

    return rows.filter((row) => {
      const hasDefect = Boolean(row.defectId);
      const hasExternalIssue = Boolean(row.externalIssueKey);
      return (
        (filters.hasDefect === 'all' ||
          (filters.hasDefect === 'yes' ? hasDefect : !hasDefect)) &&
        (filters.hasExternalIssue === 'all' ||
          (filters.hasExternalIssue === 'yes'
            ? hasExternalIssue
            : !hasExternalIssue))
      );
    });
  });
}

export type AttentionCategory =
  | 'Failed without active defect'
  | 'Blocked without active defect'
  | 'Critical defect not Closed'
  | 'High severity defect not Closed'
  | 'Ready for Retest'
  | 'No Run Test Case';

export type AttentionRow = {
  id: string;
  category: AttentionCategory;
  project: string;
  scenario: string;
  testCase: string;
  defectId: string;
  status: string;
  severity: string;
};

export type AttentionSummary = {
  failedWithoutDefect: number;
  blockedWithoutDefect: number;
  criticalOpenDefects: number;
  readyForRetest: number;
  noRunTestCases: number;
};

export function getAttentionRows(
  data: Pick<
    FilteredReportData,
    'projects' | 'scenarios' | 'testCases' | 'executions' | 'defects'
  >,
): AttentionRow[] {
  const projectNames = new Map(
    data.projects.map((project) => [project.id, project.name]),
  );
  const scenarioNames = new Map(
    data.scenarios.map((scenario) => [scenario.id, scenario.name]),
  );
  const testCaseNames = new Map(
    data.testCases.map((testCase) => [testCase.id, testCase.name]),
  );
  const unlinkedTests = getFailedOrBlockedTestsWithoutActiveDefects(
    data.testCases,
    data.executions,
    data.defects,
  );
  const testRows = unlinkedTests.map<AttentionRow>(({ testCase, execution }) => ({
    id: `test-${testCase.id}`,
    category:
      execution.overallStatus === 'Failed'
        ? 'Failed without active defect'
        : 'Blocked without active defect',
    project: projectNames.get(testCase.projectId) ?? 'Unknown Project',
    scenario: scenarioNames.get(testCase.scenarioId) ?? 'Unknown Scenario',
    testCase: testCase.name,
    defectId: '',
    status: execution.overallStatus,
    severity: '',
  }));
  const latestExecutions = getLatestExecutionsByTestCase(data.executions);
  const noRunRows = data.testCases
    .filter(
      (testCase) =>
        (latestExecutions.get(testCase.id)?.overallStatus ?? 'No Run') ===
        'No Run',
    )
    .map<AttentionRow>((testCase) => ({
      id: `no-run-${testCase.id}`,
      category: 'No Run Test Case',
      project: projectNames.get(testCase.projectId) ?? 'Unknown Project',
      scenario: scenarioNames.get(testCase.scenarioId) ?? 'Unknown Scenario',
      testCase: testCase.name,
      defectId: '',
      status: 'No Run',
      severity: '',
    }));
  const defectRows = data.defects.flatMap<AttentionRow>((defect) => {
    const categories: AttentionCategory[] = [];

    if (defect.status !== 'Closed' && defect.severity === 'Critical') {
      categories.push('Critical defect not Closed');
    }
    if (defect.status !== 'Closed' && defect.severity === 'High') {
      categories.push('High severity defect not Closed');
    }
    if (defect.status === 'Ready for Retest') {
      categories.push('Ready for Retest');
    }

    return categories.map((category) => ({
      id: `${defect.id}-${category}`,
      category,
      project: defect.projectId
        ? projectNames.get(defect.projectId) ?? 'Unknown Project'
        : 'Not linked',
      scenario: defect.scenarioId
        ? scenarioNames.get(defect.scenarioId) ?? 'Unknown Scenario'
        : 'Not linked',
      testCase: defect.testCaseId
        ? testCaseNames.get(defect.testCaseId) ?? 'Unknown Test Case'
        : 'Not linked',
      defectId: defect.defectId,
      status: defect.status,
      severity: defect.severity,
    }));
  });

  return [...testRows, ...defectRows, ...noRunRows];
}

export function getAttentionSummary(
  data: Pick<
    FilteredReportData,
    'projects' | 'scenarios' | 'testCases' | 'executions' | 'defects'
  >,
): AttentionSummary {
  const rows = getAttentionRows(data);
  const count = (category: AttentionCategory) =>
    rows.filter((row) => row.category === category).length;

  return {
    failedWithoutDefect: count('Failed without active defect'),
    blockedWithoutDefect: count('Blocked without active defect'),
    criticalOpenDefects: count('Critical defect not Closed'),
    readyForRetest: count('Ready for Retest'),
    noRunTestCases: count('No Run Test Case'),
  };
}

export type ReportKey =
  | 'executionSummary'
  | 'executionByProject'
  | 'executionByScenario'
  | 'defectSummary'
  | 'defectsByProject'
  | 'defectsBySeverity'
  | 'defectsByPriority'
  | 'defectsByStatus'
  | 'traceability'
  | 'attention';

export type ReportExportRow = Record<string, string | number>;

export function buildReportExportRows(
  report: ReportKey,
  data: FilteredReportData,
  traceabilityFilters: TraceabilityFilters = EMPTY_TRACEABILITY_FILTERS,
): ReportExportRow[] {
  const executionSummary = getExecutionSummary(
    data.testCases,
    data.executions,
  );
  const defectSummary = getDefectSummary(data.defects);

  switch (report) {
    case 'executionSummary':
      return EXECUTION_STATUSES.map((status) => ({
        Status: status,
        Count: executionSummary.counts[status],
        Percentage: executionSummary.percentages[status],
      }));
    case 'executionByProject':
      return getExecutionByProject(data).map((row) => ({
        Project: row.project,
        'Total Test Cases': row.totalTestCases,
        Passed: row.Passed,
        Failed: row.Failed,
        Blocked: row.Blocked,
        'No Run': row['No Run'],
        'Execution %': row.executionPercentage,
      }));
    case 'executionByScenario':
      return getExecutionByScenario(data).map((row) => ({
        Project: row.project,
        Scenario: row.scenario ?? '',
        'Total Test Cases': row.totalTestCases,
        Passed: row.Passed,
        Failed: row.Failed,
        Blocked: row.Blocked,
        'No Run': row['No Run'],
        'Execution %': row.executionPercentage,
      }));
    case 'defectSummary':
      return DEFECT_STATUSES.map((status) => ({
        Status: status,
        Count: defectSummary.statuses[status],
      }));
    case 'defectsByProject':
      return getDefectsByProject(data.projects, data.defects).map((row) => ({
        Project: row.project,
        Total: row.total,
        Open: row.Open,
        'In Progress': row['In Progress'],
        'Ready for Retest': row['Ready for Retest'],
        Closed: row.Closed,
        Reopened: row.Reopened,
        Critical: row.Critical,
        High: row.High,
      }));
    case 'defectsBySeverity':
      return getDefectsBySeverity(data.defects).map((row) => ({
        Severity: row.category,
        Count: row.count,
        Percentage: row.percentage,
      }));
    case 'defectsByPriority':
      return getDefectsByPriority(data.defects).map((row) => ({
        Priority: row.category,
        Count: row.count,
        Percentage: row.percentage,
      }));
    case 'defectsByStatus':
      return getDefectsByStatus(data.defects).map((row) => ({
        Status: row.category,
        Count: row.count,
        Percentage: row.percentage,
      }));
    case 'traceability':
      return getTraceabilityRows(data, traceabilityFilters).map((row) => ({
        Project: row.project,
        Scenario: row.scenario,
        'Test Case': row.testCase,
        'Latest Status': row.latestStatus,
        'Latest Execution': row.latestExecution,
        'Latest Execution Date': row.latestExecutionDate,
        'Executed By': row.executedBy,
        'Defect ID': row.defectId,
        'Defect Status': row.defectStatus,
        Severity: row.severity,
        'External System': row.externalSystem,
        'External Issue Key': row.externalIssueKey,
        'Defect Assignee': row.defectAssignee,
        'Defect Reporter': row.defectReporter,
      }));
    case 'attention':
      return getAttentionRows(data).map((row) => ({
        Category: row.category,
        Project: row.project,
        Scenario: row.scenario,
        'Test Case': row.testCase,
        'Defect ID': row.defectId,
        Status: row.status,
        Severity: row.severity,
      }));
  }
}
