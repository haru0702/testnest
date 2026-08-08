import { getSupabaseConfig, SUPABASE_CONFIGURATION_ERROR } from './supabase';

describe('Supabase configuration', () => {
  it('fails clearly when configuration is missing', () => {
    expect(() => getSupabaseConfig({})).toThrow(SUPABASE_CONFIGURATION_ERROR);
    expect(() =>
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
      }),
    ).toThrow(SUPABASE_CONFIGURATION_ERROR);
  });

  it('returns trimmed browser configuration', () => {
    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: ' https://example.supabase.co ',
        VITE_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
      }),
    ).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
    });
  });
});
