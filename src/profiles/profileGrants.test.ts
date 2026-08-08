import foundationSql from '../../supabase/migrations/20260808000100_phase_10a_foundation.sql?raw'
import migrationSql from '../../supabase/migrations/20260808000200_phase_10a_profile_select_grant.sql?raw'

describe('authenticated database grants', () => {
  it('grants only profile reads required by Phase 10A', () => {
    const tableGrants = migrationSql.match(/^grant .* on table .*;$/gim) ?? []

    expect(tableGrants).toEqual([
      'grant select on table public.profiles to authenticated;',
    ])
    expect(migrationSql).toContain(
      'revoke all privileges on table public.profiles from anon;',
    )
    expect(migrationSql).toContain(
      'revoke all privileges on table public.profiles from authenticated;',
    )
  })

  it('defers domain-table and profile-write privileges', () => {
    expect(migrationSql).not.toMatch(/grant\s+(?:insert|update|delete|all)/i)
    expect(migrationSql).not.toMatch(
      /public\.(?:projects|test_scenarios|test_cases|test_steps|test_executions|test_step_results|defects)/i,
    )
  })

  it('keeps required RLS helper execution restricted to authenticated users', () => {
    expect(foundationSql).toContain(
      'revoke all on function public.has_profile_role(text[]) from public;',
    )
    expect(foundationSql).toContain(
      'grant execute on function public.has_profile_role(text[]) to authenticated;',
    )
    expect(migrationSql).not.toMatch(/grant execute/i)
  })
})
