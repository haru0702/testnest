import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthService } from './supabaseAuthService';

describe('SupabaseAuthService', () => {
  it('treats a successful getSession response with null session as signed out', async () => {
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    await expect(new SupabaseAuthService(client).getSession()).resolves.toBeNull();
  });
});
