import type { User } from '../users/user';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated'; error?: string }
  | { status: 'authenticated'; session: AuthSession; profile: User }
  | { status: 'inactive'; session: AuthSession; profile: User }
  | { status: 'missing-profile'; session: AuthSession }
  | { status: 'unavailable'; message: string };

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
}

export interface ProfileRepository {
  getProfile(userId: string): Promise<User | null>;
}

export type AuthDependencies = {
  authService: AuthService;
  profileRepository: ProfileRepository;
};

export async function resolveAuthState(
  session: AuthSession | null,
  profileRepository: ProfileRepository,
): Promise<AuthState> {
  if (!session) {
    return { status: 'unauthenticated' };
  }

  const profile = await profileRepository.getProfile(session.user.id);

  if (!profile) {
    return { status: 'missing-profile', session };
  }

  if (profile.status === 'Inactive') {
    return { status: 'inactive', session, profile };
  }

  return { status: 'authenticated', session, profile };
}
