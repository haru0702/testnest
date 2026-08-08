export const TABLE_PAGE_SIZE = 10;

export type SortDirection = 'ascending' | 'descending';

export type Comparator<T> = (first: T, second: T) => number;

export function matchesSearch(
  query: string,
  values: readonly (string | undefined)[],
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) =>
    value?.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function filterItems<T>(
  items: readonly T[],
  predicates: readonly ((item: T) => boolean)[],
) {
  return items.filter((item) =>
    predicates.every((predicate) => predicate(item)),
  );
}

export function compareText(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: 'base' });
}

export function compareDates(first: string, second: string) {
  return new Date(first).getTime() - new Date(second).getTime();
}

export function sortItems<T>(
  items: readonly T[],
  comparator: Comparator<T>,
  direction: SortDirection,
) {
  const directionMultiplier = direction === 'ascending' ? 1 : -1;

  return [...items].sort(
    (first, second) => comparator(first, second) * directionMultiplier,
  );
}

export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize = TABLE_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (page - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page,
    totalPages,
  };
}

export function getNextSortDirection(
  currentKey: string,
  nextKey: string,
  currentDirection: SortDirection,
): SortDirection {
  return currentKey === nextKey && currentDirection === 'ascending'
    ? 'descending'
    : 'ascending';
}
