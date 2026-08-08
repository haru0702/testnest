import { useState, type FormEvent } from 'react';
import {
  getUserFormErrors,
  hasUserFormErrors,
  USER_ROLES,
  USER_STATUSES,
  type User,
  type UserFormErrors,
  type UserFormValues,
  type UserRole,
  type UserStatus,
} from '../users/user';

type UserFormProps = {
  user?: User;
  users: User[];
  onSubmit: (values: UserFormValues) => UserFormErrors;
  onCancel: () => void;
};

const inputClasses =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

const EMPTY_ERRORS: UserFormErrors = {
  firstName: null,
  lastName: null,
  email: null,
  protection: null,
};

export function UserForm({ user, users, onSubmit, onCancel }: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'Tester',
    status: user?.status ?? 'Active',
  }));
  const [errors, setErrors] = useState<UserFormErrors>(EMPTY_ERRORS);

  function update<Key extends keyof UserFormValues>(
    key: Key,
    value: UserFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null, protection: null }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = getUserFormErrors(values, users, user?.id);

    if (hasUserFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setErrors(onSubmit(values));
  }

  return (
    <section
      aria-labelledby="user-form-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h3 id="user-form-title" className="text-xl font-semibold text-slate-950">
        {user ? 'Edit User' : 'Add User'}
      </h3>
      <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="user-first-name"
            label="First Name"
            value={values.firstName}
            error={errors.firstName}
            autoFocus
            onChange={(value) => update('firstName', value)}
          />
          <TextField
            id="user-last-name"
            label="Last Name"
            value={values.lastName}
            error={errors.lastName}
            onChange={(value) => update('lastName', value)}
          />
          <TextField
            id="user-email"
            label="Email"
            type="email"
            value={values.email}
            error={errors.email}
            onChange={(value) => update('email', value)}
          />
          <SelectField
            id="user-role"
            label="Role"
            value={values.role}
            options={USER_ROLES}
            onChange={(value) => update('role', value as UserRole)}
          />
          <SelectField
            id="user-status"
            label="Status"
            value={values.status}
            options={USER_STATUSES}
            onChange={(value) => update('status', value as UserStatus)}
          />
        </div>

        {errors.protection ? (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {errors.protection}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Save User
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function TextField({
  id,
  label,
  type = 'text',
  value,
  error,
  autoFocus = false,
  onChange,
}: {
  id: string;
  label: string;
  type?: 'text' | 'email';
  value: string;
  error: string | null;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label className="text-sm font-medium text-slate-800" htmlFor={id}>
        {label} *
      </label>
      <input
        id={id}
        type={type}
        autoFocus={autoFocus}
        className={inputClasses}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-800" htmlFor={id}>
        {label} *
      </label>
      <select
        id={id}
        className={`testnest-select ${inputClasses}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
