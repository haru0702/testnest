import { mapProfileRow } from './profileRepository';

describe('profile database mapping', () => {
  it('maps PostgreSQL profile columns to the Phase 9 User model', () => {
    expect(
      mapProfileRow({
        id: 'profile-id',
        first_name: 'Taylor',
        last_name: 'Tester',
        display_name: 'Taylor Tester',
        email: 'taylor@example.test',
        role: 'Tester',
        status: 'Active',
        created_at: '2026-08-08T00:00:00.000Z',
        updated_at: '2026-08-08T01:00:00.000Z',
      }),
    ).toEqual({
      id: 'profile-id',
      firstName: 'Taylor',
      lastName: 'Tester',
      displayName: 'Taylor Tester',
      email: 'taylor@example.test',
      role: 'Tester',
      status: 'Active',
      createdDate: '2026-08-08T00:00:00.000Z',
      updatedDate: '2026-08-08T01:00:00.000Z',
    });
  });

  it('rejects unsupported authorization data', () => {
    expect(() =>
      mapProfileRow({
        id: 'profile-id',
        first_name: 'Unsafe',
        last_name: 'Role',
        display_name: 'Unsafe Role',
        email: 'unsafe@example.test',
        role: 'Owner',
        status: 'Active',
        created_at: '2026-08-08T00:00:00.000Z',
        updated_at: '2026-08-08T00:00:00.000Z',
      }),
    ).toThrow('unsupported role or status');
  });
});
