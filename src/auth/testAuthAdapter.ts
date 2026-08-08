import { createDefaultAdmin, loadUsers } from '../users/userStorage';
import type { User } from '../users/user';
import type {
  AuthDependencies,
  AuthService,
  AuthSession,
  AuthUser,
  ProfileRepository,
} from './auth';

export const TEST_AUTH_STORAGE_KEY = 'testnest.testAuth';

export type TestAuthFixture = {
  session: AuthSession | null;
  accounts: AuthUser[];
  profiles: User[];
  signInError?: string;
  profileError?: { code: string; message: string };
  unavailableError?: string;
};

type Listener = (session: AuthSession | null) => void;

function readLegacyFixture(): TestAuthFixture {
  const profiles = loadUsers();
  const storedId = window.localStorage.getItem('testnest.activeUserId');
  const profile =
    profiles.find((candidate) => candidate.id === storedId) ??
    profiles.find(
      (candidate) =>
        candidate.role === 'Admin' && candidate.status === 'Active',
    ) ??
    profiles.find((candidate) => candidate.status === 'Active') ??
    createDefaultAdmin();

  return {
    session: { user: { id: profile.id, email: profile.email } },
    accounts: profiles.map(({ id, email }) => ({ id, email })),
    profiles,
  };
}

export function readTestAuthFixture(): TestAuthFixture {
  const stored = window.localStorage.getItem(TEST_AUTH_STORAGE_KEY);
  if (!stored) return readLegacyFixture();

  try {
    return JSON.parse(stored) as TestAuthFixture;
  } catch {
    return readLegacyFixture();
  }
}

function writeTestAuthFixture(fixture: TestAuthFixture) {
  window.localStorage.setItem(TEST_AUTH_STORAGE_KEY, JSON.stringify(fixture));
}

class TestAuthService implements AuthService {
  private readonly listeners = new Set<Listener>();

  async getSession() {
    const fixture = readTestAuthFixture();
    if (fixture.unavailableError) throw new Error(fixture.unavailableError);
    return fixture.session;
  }

  async signInWithPassword(email: string, _password: string) {
    const fixture = readTestAuthFixture();
    if (fixture.unavailableError) throw new Error(fixture.unavailableError);
    if (fixture.signInError) throw new Error(fixture.signInError);

    const account = fixture.accounts.find(
      (candidate) =>
        candidate.email.toLocaleLowerCase() === email.trim().toLocaleLowerCase(),
    );
    if (!account) throw new Error('Invalid login credentials');

    const session = { user: account };
    writeTestAuthFixture({ ...fixture, session });
    this.listeners.forEach((listener) => listener(session));
    return session;
  }

  async signOut() {
    const fixture = readTestAuthFixture();
    writeTestAuthFixture({ ...fixture, session: null });
    this.listeners.forEach((listener) => listener(null));
  }

  onAuthStateChange(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class TestProfileRepository implements ProfileRepository {
  async getProfile(userId: string) {
    const fixture = readTestAuthFixture();
    if (fixture.unavailableError) throw new Error(fixture.unavailableError);
    if (fixture.profileError) throw fixture.profileError;
    return fixture.profiles.find((profile) => profile.id === userId) ?? null;
  }
}

export function createTestAuthDependencies(): AuthDependencies {
  return {
    authService: new TestAuthService(),
    profileRepository: new TestProfileRepository(),
  };
}
