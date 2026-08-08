# Supabase Architecture

## Phase 10A boundary

The browser uses one client from `src/lib/supabase.ts`. `SupabaseAuthService` owns email/password sessions, and `SupabaseProfileRepository` maps the authenticated `auth.users` UUID to a `public.profiles` record. React components receive a Phase 9 `User` profile and continue using the centralized permission map.

Projects, scenarios, test cases, test steps, executions, step results, defects, reports, imports/exports, and the local User Management roster still read and write localStorage. Phase 10A does not upload or delete local data. The signed-in profile, not `testnest.activeUserId`, controls production permissions.

## Environment

Create `.env.local` with:

```text
VITE_SUPABASE_URL=<project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<browser-safe publishable key>
```

`.env.local`, `.env`, and other local environment files are ignored. Only placeholder values belong in `.env.example`. Database passwords, user passwords, secret keys, and `service_role` keys must never be placed in frontend variables.

## Apply migrations

The reviewable migrations are:

1. `supabase/migrations/20260808000100_phase_10a_foundation.sql`
2. `supabase/migrations/20260808000200_phase_10a_profile_select_grant.sql`

The second migration supplies the one PostgreSQL table privilege currently required before RLS can evaluate the profile lookup: `SELECT` on `public.profiles` for `authenticated`. It first removes any existing table privileges from `anon` and `authenticated`, then grants only that read permission. Existing projects that already applied the foundation migration must apply this corrective migration as well.

With the Supabase CLI authenticated and linked to the intended project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Alternatively, an authorized project administrator can run each unapplied migration once, in filename order, in the Supabase SQL Editor. Verify the target project before applying it.

## First Admin bootstrap

1. In Supabase Dashboard, open Authentication > Users and create the first email/password user. Choose a private password there; do not add it to this repository.
2. Copy that Auth user's UUID.
3. In Supabase SQL Editor, replace the placeholders and run:

```sql
insert into public.profiles (
  id, first_name, last_name, display_name, email, role, status
)
values (
  '<auth-user-uuid>',
  '<first-name>',
  '<last-name>',
  '<display-name>',
  '<same-auth-email>',
  'Admin',
  'Active'
);
```

4. Open TestNest and sign in with that Auth user's email/password.

There is intentionally no default account, hardcoded password, public signup, or browser-side Admin API.

## Authentication flow

On startup TestNest restores the Supabase session, loads `profiles.id = auth.uid()`, and then applies the existing role-to-permission map. The application shell is rendered only for an Active profile. An inactive profile, missing profile, unavailable Supabase service, or missing environment configuration receives a dedicated safe state. Logout calls Supabase and returns to Login.

## RLS foundation

RLS is enabled on every public application table. A table-level grant answers whether a PostgreSQL role may attempt an operation; an RLS policy then decides which rows that operation may access. Phase 10A grants `authenticated` only table-level `SELECT` on `public.profiles`. The existing `profiles_select_self_or_admin` policy still limits a normal signed-in user to their own row while allowing an Admin profile to read profiles permitted by that policy. No profile insert, update, or delete privilege is granted, so the RLS mutation policies cannot be reached through the Data API yet.

Anonymous users have neither profile table privileges nor applicable policies. Projects, scenarios, cases, steps, executions, step results, and defects have RLS policies defined as a foundation, but deliberately receive no Data API table grants in Phase 10A because those features still use localStorage. Their operation-specific grants are deferred until their repositories move to Supabase and the policies are hardened for that boundary.

The foundation migration already revokes public execution and grants `authenticated` execution on the role-checking helper functions used by RLS. TestNest does not call those functions as browser-side RPCs, so the corrective migration adds no function grants.

Phase 10B security hardening must add column-level/RPC enforcement for constrained defect status transitions and assignment changes, transactional multi-table writes, and any final distinctions needed to mirror every UI permission. The current policies are a secure minimum, not an all-authenticated write bypass.

## Testing boundary

Vitest injects service doubles. Playwright starts Vite with `VITE_TEST_AUTH_MODE=true`; this uses local fixture state and never contacts Supabase. The adapter is gated by Vite development/test mode, so setting that variable cannot enable it in a production build. No real test credentials are stored in Git.
