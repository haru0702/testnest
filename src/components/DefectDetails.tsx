import type { Defect } from '../defects/defect';
import type { TestExecution } from '../executions/execution';
import type { Project } from '../projects/project';
import type { TestCase, TestScenario } from '../testCases/testCase';
import { DefectBadge } from './DefectBadge';
import { getUserReferenceLabel } from '../users/user';

export type DefectExecutionContext = {
  projectId: string;
  scenarioId: string;
  testCaseId: string;
  executionId?: string;
};

type DefectDetailsProps = {
  defect: Defect;
  projects: Project[];
  scenarios: TestScenario[];
  testCases: TestCase[];
  executions: TestExecution[];
  onClose: () => void;
  onViewExecution: (context: DefectExecutionContext) => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function DefectDetails({
  defect,
  projects,
  scenarios,
  testCases,
  executions,
  onClose,
  onViewExecution,
}: DefectDetailsProps) {
  const project = projects.find((item) => item.id === defect.projectId);
  const scenario = scenarios.find((item) => item.id === defect.scenarioId);
  const testCase = testCases.find((item) => item.id === defect.testCaseId);
  const execution = executions.find((item) => item.id === defect.executionId);
  const linkedStep = execution?.stepResults.find(
    (step) => step.testStepId === defect.testStepId,
  );
  const canNavigate = Boolean(
    defect.projectId && defect.scenarioId && defect.testCaseId,
  );

  return (
    <section
      aria-labelledby="defect-details-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold text-teal-700">{defect.defectId}</p>
          <h3 id="defect-details-title" className="mt-1 text-xl font-semibold text-slate-950">
            {defect.title}
          </h3>
        </div>
        <button type="button" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700" onClick={onClose}>
          Close Details
        </button>
      </div>

      <DetailsSection title="Basic Information">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="ID" value={defect.defectId} />
          <div><dt className="font-medium text-slate-600">Status</dt><dd className="mt-1"><DefectBadge kind="status" value={defect.status} /></dd></div>
          <div><dt className="font-medium text-slate-600">Severity</dt><dd className="mt-1"><DefectBadge kind="severity" value={defect.severity} /></dd></div>
          <div><dt className="font-medium text-slate-600">Priority</dt><dd className="mt-1"><DefectBadge kind="priority" value={defect.priority} /></dd></div>
          <Detail label="Assignee" value={defect.assignee?.displayName || defect.assigneeName || 'Unassigned'} />
          <Detail label="Reporter" value={defect.reporter?.displayName || defect.reporterName || 'Not provided'} />
          <Detail label="Created By" value={getUserReferenceLabel(defect.createdBy)} />
          <Detail label="Updated By" value={getUserReferenceLabel(defect.updatedBy)} />
        </dl>
      </DetailsSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <TextDetails title="Description" value={defect.description} />
        <TextDetails title="Steps to Reproduce" value={defect.stepsToReproduce} />
        <TextDetails title="Expected Result" value={defect.expectedResult} />
        <TextDetails title="Actual Result" value={defect.actualResult} />
      </div>

      <DetailsSection title="Traceability">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Project" value={project?.name ?? 'Not linked'} />
          <Detail label="Scenario" value={scenario?.name ?? 'Not linked'} />
          <Detail label="Test Case" value={testCase?.name ?? 'Not linked'} />
          <Detail
            label="Execution"
            value={execution ? `EX-${execution.id.slice(0, 8).toLocaleUpperCase()} - ${execution.overallStatus}` : 'Not linked'}
          />
          <Detail
            label="Test Step"
            value={
              defect.testStepNumber
                ? `Step ${defect.testStepNumber}${linkedStep ? `: ${linkedStep.stepDescription}` : ''}`
                : 'Not linked'
            }
          />
        </dl>
        {canNavigate ? (
          <button
            type="button"
            className="mt-4 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            onClick={() =>
              onViewExecution({
                projectId: defect.projectId!,
                scenarioId: defect.scenarioId!,
                testCaseId: defect.testCaseId!,
                executionId: defect.executionId,
              })
            }
          >
            View Linked Test Execution
          </button>
        ) : null}
      </DetailsSection>

      <DetailsSection title="External Work Item">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="System" value={defect.externalSystem ?? 'Not linked'} />
          <Detail label="Issue Key" value={defect.externalIssueKey ?? 'Not linked'} />
          <div>
            <dt className="font-medium text-slate-600">Issue</dt>
            <dd className="mt-1 text-slate-950">
              {defect.externalIssueUrl ? (
                <a
                  href={defect.externalIssueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900"
                >
                  Open External Issue
                </a>
              ) : 'Not linked'}
            </dd>
          </div>
        </dl>
      </DetailsSection>

      <DetailsSection title="Dates">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail label="Created" value={dateFormatter.format(new Date(defect.createdDate))} />
          <Detail label="Updated" value={dateFormatter.format(new Date(defect.updatedDate))} />
        </dl>
      </DetailsSection>
    </section>
  );
}

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = `defect-details-${title
    .toLocaleLowerCase()
    .replaceAll(' ', '-')}`;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-7 border-t border-slate-200 pt-5"
    >
      <h4 id={headingId} className="font-semibold text-slate-950">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TextDetails({ title, value }: { title: string; value: string }) {
  return (
    <section className="border-t border-slate-200 pt-5">
      <h4 className="font-semibold text-slate-950">{title}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || 'Not provided'}</p>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="mt-1 break-words text-slate-950">{value}</dd>
    </div>
  );
}
