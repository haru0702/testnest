import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { AuthService, AuthSession } from './auth';

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
    },
  };
}

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return toAuthSession(data.session);
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;

    const session = toAuthSession(data.session);
    if (!session) throw new Error('Sign in completed without a valid session.');
    return session;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(listener: (session: AuthSession | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toAuthSession(session));
    });

    return () => data.subscription.unsubscribe();
  }
}
