# Phase 10B Migration Plan

Phase 10B will move domain repositories from localStorage to Supabase. It is not implemented in Phase 10A.

## Inventory

| localStorage key | TypeScript source | PostgreSQL target | Main transformation |
| --- | --- | --- | --- |
| `testnest.users` | `User` | `auth.users`, `profiles` | Provision Auth identities through an approved Admin flow; map local IDs to Auth UUIDs and convert profile fields to snake_case. Never migrate passwords. |
| `testnest.activeUserId` | `string` | none | Discard after verification; Supabase session is authoritative. |
| `testnest.projects` | `Project` | `projects` | Convert dates/audit snapshots and map user references. |
| `testnest.scenarios` | `TestScenario` | `test_scenarios` | Convert `projectId`, dates, and audit references to foreign keys. |
| `testnest.testCases` | `TestCase`, embedded `TestStep[]` | `test_cases`, `test_steps` | Split steps into ordered rows and map project/scenario IDs. |
| `testnest.executions` | `TestExecution`, embedded `StepExecutionResult[]` | `test_executions`, `test_step_results` | Split result snapshots, retain historical text, map context and executor. |
| `testnest.defects` | `Defect` | `defects` | Convert traceability, owner, audit, external-reference, and date fields. |

The executable inventory is also exported by `src/migrations/localStorageMigration.ts` and unit tested against every current storage key.

## Migration order

1. Export and validate a read-only snapshot of every key. Keep the original localStorage untouched.
2. Provision/link Auth users and build the local user ID to profile UUID map.
3. Insert projects, scenarios, test cases, and test steps while building replacement maps for any non-UUID legacy IDs.
4. Insert executions and step-result snapshots, then defects, resolving every optional relationship through the maps.
5. Compare entity counts, scoped unique names, step ordering, latest execution dashboard results, defect numbers, audit labels, and orphan reports.
6. Switch one repository boundary at a time to Supabase with rollback flags; do not remove local data until acceptance and backup retention are complete.

Existing IDs can be preserved only when they are valid UUIDs and do not conflict. User identity IDs always map to Supabase Auth UUIDs. Embedded audit `UserReference` values require the user map; unresolved legacy references remain readable snapshots and are reported rather than silently assigned.
