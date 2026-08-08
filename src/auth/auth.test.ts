import { resolveAuthState, type AuthSession } from './auth';
import { hasPermission } from '../users/permissions';
import type { User } from '../users/user';

const session: AuthSession = {
  user: { id: 'profile-1', email: 'qa@example.test' },
};

const profile: User = {
  id: 'profile-1',
  firstName: 'Quinn',
  lastName: 'Lead',
  displayName: 'Quinn Lead',
  email: 'qa@example.test',
  role: 'QA Lead',
  status: 'Active',
  createdDate: '2026-08-08T00:00:00.000Z',
  updatedDate: '2026-08-08T00:00:00.000Z',
};

describe('authentication state resolution', () => {
  it('returns unauthenticated without a session', async () => {
    const repository = { getProfile: vi.fn() };
    expect(await resolveAuthState(null, repository)).toEqual({ status: 'unauthenticated' });
    expect(repository.getProfile).not.toHaveBeenCalled();
  });

  it('loads an authenticated profile', async () => {
    const state = await resolveAuthState(session, {
      getProfile: vi.fn().mockResolvedValue(profile),
    });
    expect(state).toEqual({ status: 'authenticated', session, profile });
  });

  it('returns a safe missing-profile state', async () => {
    const state = await resolveAuthState(session, {
      getProfile: vi.fn().mockResolvedValue(null),
    });
    expect(state).toEqual({ status: 'missing-profile', session });
  });

  it('returns a blocked state for an inactive profile', async () => {
    const inactive = { ...profile, status: 'Inactive' as const };
    const state = await resolveAuthState(session, {
      getProfile: vi.fn().mockResolvedValue(inactive),
    });
    expect(state).toEqual({ status: 'inactive', session, profile: inactive });
  });

  it('feeds the authenticated role into the Phase 9 permission map', async () => {
    const state = await resolveAuthState(session, {
      getProfile: vi.fn().mockResolvedValue(profile),
    });
    expect(state.status).toBe('authenticated');
    if (state.status !== 'authenticated') return;
    expect(hasPermission(state.profile, 'canCreateProjects')).toBe(true);
    expect(hasPermission(state.profile, 'canManageUsers')).toBe(false);
  });
});
