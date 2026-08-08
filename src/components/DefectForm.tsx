import { useState, type FormEvent, type ReactNode } from 'react';
import {
  DEFECT_PRIORITIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  EMPTY_DEFECT_FORM_VALUES,
  EXTERNAL_SYSTEMS,
  getDefectFormValues,
  type Defect,
  type DefectFormErrors,
  type DefectFormValues,
  type DefectPriority,
  type DefectSeverity,
  type DefectStatus,
  type ExternalSystem,
} from '../defects/defect';
import type { TestExecution } from '../executions/execution';
import type { Project } from '../projects/project';
import type { TestCase, TestScenario } from '../testCases/testCase';
import { getAssignableUsers, type User } from '../users/user';

type DefectFormProps = {
  defect?: Defect;
  initialValues?: DefectFormValues;
  projects: Project[];
  scenarios: TestScenario[];
  testCases: TestCase[];
  executions: TestExecution[];
  onSubmit: (values: DefectFormValues) => DefectFormErrors;
  onCancel: () => void;
  users: User[];
  activeUser: User;
  canAssignDefects: boolean;
  canManageStatus: boolean;
};

const inputClasses =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function executionReference(execution: TestExecution) {
  return `EX-${execution.id.slice(0, 8).toLocaleUpperCase()} - ${dateFormatter.format(new Date(execution.executionDate))} - ${execution.overallStatus}`;
}

export function DefectForm({
  defect,
  initialValues,
  projects,
  scenarios,
  testCases,
  executions,
  onSubmit,
  onCancel,
  users,
  activeUser,
  canAssignDefects,
  canManageStatus,
}: DefectFormProps) {
  const [values, setValues] = useState<DefectFormValues>(() =>
    defect
      ? getDefectFormValues(defect)
      : {
          ...(initialValues ?? EMPTY_DEFECT_FORM_VALUES),
          reporterName:
            initialValues?.reporterName || activeUser.displayName,
          reporterUserId:
            initialValues?.reporterUserId || activeUser.id,
        },
  );
  const [errors, setErrors] = useState<DefectFormErrors>({
    titleError: null,
    externalIssueUrlError: null,
  });

  const availableScenarios = scenarios.filter(
    (scenario) => scenario.projectId === values.projectId,
  );
  const availableTestCases = testCases.filter(
    (testCase) => testCase.scenarioId === values.scenarioId,
  );
  const availableExecutions = executions.filter(
    (execution) => execution.testCaseId === values.testCaseId,
  );
  const selectedExecution = availableExecutions.find(
    (execution) => execution.id === values.executionId,
  );
  const selectedAssignee = users.find(
    (user) => user.id === values.assigneeUserId,
  );
  const assignableUsers = getAssignableUsers(users);
  const assigneeOptions = selectedAssignee && selectedAssignee.status === 'Inactive'
    ? [...assignableUsers, selectedAssignee]
    : assignableUsers;

  function updateValue<Key extends keyof DefectFormValues>(
    key: Key,
    value: DefectFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleProjectChange(projectId: string) {
    setValues((current) => ({
      ...current,
      projectId,
      scenarioId: '',
      testCaseId: '',
      executionId: '',
      testStepId: '',
      testStepNumber: undefined,
    }));
  }

  function handleScenarioChange(scenarioId: string) {
    setValues((current) => ({
      ...current,
      scenarioId,
      testCaseId: '',
      executionId: '',
      testStepId: '',
      testStepNumber: undefined,
    }));
  }

  function handleTestCaseChange(testCaseId: string) {
    setValues((current) => ({
      ...current,
      testCaseId,
      executionId: '',
      testStepId: '',
      testStepNumber: undefined,
    }));
  }

  function handleExecutionChange(executionId: string) {
    setValues((current) => ({
      ...current,
      executionId,
      testStepId: '',
      testStepNumber: undefined,
    }));
  }

  function handleStepChange(testStepId: string) {
    const selectedStep = selectedExecution?.stepResults.find(
      (step) => step.testStepId === testStepId,
    );
    setValues((current) => ({
      ...current,
      testStepId,
      testStepNumber: selectedStep?.stepNumber,
    }));
  }

  function handleAssigneeChange(userId: string) {
    setValues((current) => ({
      ...current,
      assigneeUserId: userId,
      assigneeName: userId ? current.assigneeName : '',
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors(onSubmit(values));
  }

  return (
    <section
      aria-labelledby="defect-form-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h3 id="defect-form-title" className="text-xl font-semibold text-slate-950">
        {defect ? 'Edit Defect' : 'Add Defect'}
      </h3>
      {initialValues?.executionId && !defect ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review and update the execution details before saving this defect.
        </p>
      ) : null}

      <form className="mt-6 space-y-7" noValidate onSubmit={handleSubmit}>
        <FormSection title="Basic Information">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <FieldLabel htmlFor="defect-title" required>Title</FieldLabel>
              <input
                id="defect-title"
                type="text"
                autoFocus
                className={inputClasses}
                value={values.title}
                aria-invalid={Boolean(errors.titleError)}
                aria-describedby={errors.titleError ? 'defect-title-error' : undefined}
                onChange={(event) => {
                  updateValue('title', event.target.value);
                  setErrors((current) => ({ ...current, titleError: null }));
                }}
              />
              {errors.titleError ? (
                <p id="defect-title-error" className="mt-2 text-sm text-rose-700">
                  {errors.titleError}
                </p>
              ) : null}
            </div>
            <SelectField
              id="defect-status"
              label="Status"
              value={values.status}
              options={DEFECT_STATUSES}
              required
              disabled={!canManageStatus}
              onChange={(value) => updateValue('status', value as DefectStatus)}
            />
            <SelectField
              id="defect-severity"
              label="Severity"
              value={values.severity}
              options={DEFECT_SEVERITIES}
              required
              onChange={(value) => updateValue('severity', value as DefectSeverity)}
            />
            <SelectField
              id="defect-priority"
              label="Priority"
              value={values.priority}
              options={DEFECT_PRIORITIES}
              required
              onChange={(value) => updateValue('priority', value as DefectPriority)}
            />
            <SelectField
              id="defect-assignee"
              label="Assignee"
              value={values.assigneeUserId ?? ''}
              placeholder={values.assigneeName ? `Keep ${values.assigneeName}` : 'Unassigned'}
              disabled={!canAssignDefects}
              options={assigneeOptions.map((user) => ({ value: user.id, label: `${user.displayName}${user.status === 'Inactive' ? ' (Inactive)' : ''}` }))}
              onChange={handleAssigneeChange}
            />
            <div>
              <FieldLabel htmlFor="defect-reporter">Reporter</FieldLabel>
              <input id="defect-reporter" type="text" readOnly className={`${inputClasses} bg-slate-100`} value={values.reporterName || activeUser.displayName} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Defect Details">
          <div className="grid gap-5 lg:grid-cols-2">
            <TextAreaField
              id="defect-description"
              label="Description"
              value={values.description}
              onChange={(value) => updateValue('description', value)}
            />
            <TextAreaField
              id="defect-steps"
              label="Steps to Reproduce"
              value={values.stepsToReproduce}
              onChange={(value) => updateValue('stepsToReproduce', value)}
            />
            <TextAreaField
              id="defect-expected-result"
              label="Expected Result"
              value={values.expectedResult}
              onChange={(value) => updateValue('expectedResult', value)}
            />
            <TextAreaField
              id="defect-actual-result"
              label="Actual Result"
              value={values.actualResult}
              onChange={(value) => updateValue('actualResult', value)}
            />
          </div>
        </FormSection>

        <FormSection title="Traceability">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <SelectField
              id="defect-project"
              label="Linked Project"
              value={values.projectId}
              placeholder="No linked project"
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
              onChange={handleProjectChange}
            />
            <SelectField
              id="defect-scenario"
              label="Linked Scenario"
              value={values.scenarioId}
              placeholder="No linked scenario"
              disabled={!values.projectId}
              options={availableScenarios.map((scenario) => ({ value: scenario.id, label: scenario.name }))}
              onChange={handleScenarioChange}
            />
            <SelectField
              id="defect-test-case"
              label="Linked Test Case"
              value={values.testCaseId}
              placeholder="No linked test case"
              disabled={!values.scenarioId}
              options={availableTestCases.map((testCase) => ({ value: testCase.id, label: testCase.name }))}
              onChange={handleTestCaseChange}
            />
            <SelectField
              id="defect-execution"
              label="Linked Execution"
              value={values.executionId}
              placeholder="No linked execution"
              disabled={!values.testCaseId}
              options={availableExecutions.map((execution) => ({ value: execution.id, label: executionReference(execution) }))}
              onChange={handleExecutionChange}
            />
            <SelectField
              id="defect-test-step"
              label="Linked Test Step"
              value={values.testStepId}
              placeholder="No linked test step"
              disabled={!selectedExecution || selectedExecution.stepResults.length === 0}
              options={(selectedExecution?.stepResults ?? []).map((step) => ({
                value: step.testStepId,
                label: `Step ${step.stepNumber}: ${step.stepDescription}`,
              }))}
              onChange={handleStepChange}
            />
          </div>
        </FormSection>

        <FormSection title="External Work Item">
          <div className="grid gap-5 lg:grid-cols-3">
            <SelectField
              id="defect-external-system"
              label="External System"
              value={values.externalSystem}
              placeholder="No external system"
              options={EXTERNAL_SYSTEMS}
              onChange={(value) => updateValue('externalSystem', value as '' | ExternalSystem)}
            />
            <TextField
              id="defect-external-key"
              label="External Issue Key"
              value={values.externalIssueKey}
              onChange={(value) => updateValue('externalIssueKey', value)}
            />
            <div>
              <FieldLabel htmlFor="defect-external-url">External Issue URL</FieldLabel>
              <input
                id="defect-external-url"
                type="url"
                placeholder="https://example.com/issue/ABC-123"
                className={inputClasses}
                value={values.externalIssueUrl}
                aria-invalid={Boolean(errors.externalIssueUrlError)}
                aria-describedby={errors.externalIssueUrlError ? 'defect-external-url-error' : undefined}
                onChange={(event) => {
                  updateValue('externalIssueUrl', event.target.value);
                  setErrors((current) => ({ ...current, externalIssueUrlError: null }));
                }}
              />
              {errors.externalIssueUrlError ? (
                <p id="defect-external-url-error" className="mt-2 text-sm text-rose-700">
                  {errors.externalIssueUrlError}
                </p>
              ) : null}
            </div>
          </div>
        </FormSection>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Save Defect
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-base font-semibold text-slate-950">{title}</legend>
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800" htmlFor={htmlFor}>
      {children}{required ? ' *' : ''}
    </label>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type="text"
        className={inputClasses}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        rows={4}
        className={`${inputClasses} resize-y`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  disabled = false,
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <select
        id={id}
        className={`testnest-select ${inputClasses}`}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return <option key={value} value={value}>{optionLabel}</option>;
        })}
      </select>
    </div>
  );
}
