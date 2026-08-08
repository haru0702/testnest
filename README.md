# TestNest

TestNest is a React, TypeScript, and Vite test management application. Phase 10A adds Supabase email/password authentication and a PostgreSQL/RLS foundation. Existing business data still uses browser localStorage until Phase 10B.

## Local setup

1. Run `npm install`.
2. Create `.env.local` from `.env.example`.
3. Add the Supabase project URL and browser-safe publishable key. Never use a `service_role` or secret key in Vite.
4. Apply the migration and bootstrap the first Admin as described in [Supabase architecture](docs/supabase-architecture.md).
5. Run `npm run dev` and open the URL printed by Vite.

Commands:

- `npm run typecheck` - TypeScript checks
- `npm run test` - Vitest unit tests
- `npm run test:e2e` - Playwright acceptance and regression tests
- `npm run build` - production build

The Playwright server enables a development-only auth adapter so tests do not require live Supabase credentials. That adapter cannot be activated in a production build.

See [Phase 10B migration plan](docs/phase-10b-migration-plan.md) for the exact localStorage migration inventory.
