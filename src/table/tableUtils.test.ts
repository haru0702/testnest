import {
  compareText,
  filterItems,
  getNextSortDirection,
  matchesSearch,
  paginateItems,
  sortItems,
} from './tableUtils';

const records = [
  { name: 'Customer Portal', status: 'Active' },
  { name: 'Mobile App', status: 'On Hold' },
  { name: 'Payments API', status: 'Active' },
];

describe('table utilities', () => {
  it('matches search without considering case or surrounding whitespace', () => {
    expect(matchesSearch('  PORTAL  ', ['Customer Portal'])).toBe(true);
    expect(matchesSearch('portal', ['Mobile App'])).toBe(false);
  });

  it('combines multiple filters', () => {
    const filtered = filterItems(records, [
      (record) => matchesSearch('p', [record.name]),
      (record) => record.status === 'Active',
    ]);

    expect(filtered.map((record) => record.name)).toEqual([
      'Customer Portal',
      'Payments API',
    ]);
  });

  it('sorts ascending and descending', () => {
    const comparator = (first: (typeof records)[number], second: (typeof records)[number]) =>
      compareText(first.name, second.name);

    expect(
      sortItems(records, comparator, 'ascending').map((record) => record.name),
    ).toEqual(['Customer Portal', 'Mobile App', 'Payments API']);
    expect(
      sortItems(records, comparator, 'descending').map(
        (record) => record.name,
      ),
    ).toEqual(['Payments API', 'Mobile App', 'Customer Portal']);
  });

  it('paginates records and clamps an out-of-range page after filtering', () => {
    const items = Array.from({ length: 21 }, (_, index) => index + 1);

    expect(paginateItems(items, 2, 10)).toEqual({
      items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      page: 2,
      totalPages: 3,
    });
    expect(paginateItems(items.slice(0, 3), 2, 10)).toEqual({
      items: [1, 2, 3],
      page: 1,
      totalPages: 1,
    });
  });

  it('toggles an active sort and starts a new column ascending', () => {
    expect(getNextSortDirection('name', 'name', 'ascending')).toBe(
      'descending',
    );
    expect(getNextSortDirection('updatedDate', 'name', 'descending')).toBe(
      'ascending',
    );
  });
});
