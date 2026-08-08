import {
  formatSafeError,
  getSafeErrorDiagnostic,
  redactAuthenticationDetails,
} from './authError';

describe('safe authentication diagnostics', () => {
  it('extracts PostgREST errors that are not Error instances', () => {
    expect(
      getSafeErrorDiagnostic(
        {
          code: '42501',
          message: 'permission denied for table profiles',
          details: null,
        },
        'Profile lookup failed.',
      ),
    ).toEqual({
      category: '42501',
      message: 'permission denied for table profiles',
    });
  });

  it('redacts configured values, keys, tokens, and Supabase URLs', () => {
    const configuredValue = 'configured-browser-value';
    const unsafe =
      'configured-browser-value sb_publishable_example eyJabc.def.ghi https://project-ref.supabase.co';

    expect(redactAuthenticationDetails(unsafe, [configuredValue])).toBe(
      '<redacted> <redacted-key> <redacted-token> <supabase-url>',
    );
  });

  it('includes a safe category in development diagnostics', () => {
    expect(
      formatSafeError(
        { code: 'PGRST205', message: 'Table is not in the schema cache.' },
        'Profile lookup failed.',
        { includeCategory: true },
      ),
    ).toBe('[PGRST205] Table is not in the schema cache.');
  });
});
