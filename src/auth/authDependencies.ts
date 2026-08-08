import { getSupabaseClient } from '../lib/supabase';
import { SupabaseProfileRepository } from '../profiles/profileRepository';
import type { AuthDependencies } from './auth';
import { SupabaseAuthService } from './supabaseAuthService';

let dependencies: AuthDependencies | null = null;

export function getAuthDependencies() {
  if (!dependencies) {
    const client = getSupabaseClient();
    dependencies = {
      authService: new SupabaseAuthService(client),
      profileRepository: new SupabaseProfileRepository(client),
    };
  }

  return dependencies;
}
