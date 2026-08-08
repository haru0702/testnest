import type { ReactNode } from 'react';
import type { SortDirection } from '../table/tableUtils';

export type SelectOption = {
  value: string;
  label: string;
};

export function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
      {children}
    </div>
  );
}

type TableSearchFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function TableSearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: TableSearchFieldProps) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type TableFilterSelectProps = {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export function TableFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: TableFilterSelectProps) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="testnest-select w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
      onClick={onClick}
    >
      Clear Filters
    </button>
  );
}

export function TableResultCount({ count }: { count: number }) {
  return (
    <p className="text-sm text-slate-600" aria-live="polite">
      {count} {count === 1 ? 'result' : 'results'}
    </p>
  );
}

export function TableHeader({ label }: { label: string }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600"
    >
      {label}
    </th>
  );
}

type SortableTableHeaderProps<SortKey extends string> = {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (sortKey: SortKey) => void;
};

export function SortableTableHeader<SortKey extends string>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: SortableTableHeaderProps<SortKey>) {
  const isActive = sortKey === activeSortKey;

  return (
    <th
      scope="col"
      aria-sort={isActive ? direction : 'none'}
      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600"
    >
      <button
        type="button"
        aria-label={`Sort by ${label}${isActive ? `, currently ${direction}` : ''}`}
        className="inline-flex items-center gap-2 rounded-sm hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? (
          <span aria-hidden="true">
            {direction === 'ascending' ? '↑' : '↓'}
          </span>
        ) : null}
      </button>
    </th>
  );
}

type TablePaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Table pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <button
        type="button"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm font-medium text-slate-700">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function TableNoResults({
  itemName,
  onClear,
}: {
  itemName: string;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-slate-950">
        No {itemName} match your filters.
      </p>
      <button
        type="button"
        className="mt-3 text-sm font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900"
        onClick={onClear}
      >
        Clear Filters
      </button>
    </div>
  );
}
