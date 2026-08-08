import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIGURATION_ERROR =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the development server.';

export type SupabaseEnvironment = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

export function getSupabaseConfig(environment: SupabaseEnvironment) {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(SUPABASE_CONFIGURATION_ERROR);
  }

  return { url, publishableKey };
}

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!client) {
    const { url, publishableKey } = getSupabaseConfig({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY:
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    });
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}
