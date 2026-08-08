create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (btrim(first_name) <> ''),
  last_name text not null check (btrim(last_name) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  email text not null check (btrim(email) <> ''),
  role text not null check (role in ('Admin', 'QA Lead', 'Tester', 'Developer', 'Viewer')),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique_idx on public.profiles (lower(btrim(email)));
create index profiles_role_status_idx on public.profiles (role, status);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  description text not null default '',
  status text not null default 'Active' check (status in ('Active', 'On Hold', 'Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create unique index projects_name_unique_idx on public.projects (lower(btrim(name)));
create index projects_status_idx on public.projects (status);
create index projects_created_by_idx on public.projects (created_by);

create table public.test_scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (id, project_id)
);

create unique index test_scenarios_project_name_unique_idx
  on public.test_scenarios (project_id, lower(btrim(name)));
create index test_scenarios_project_id_idx on public.test_scenarios (project_id);

create table public.test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scenario_id uuid not null references public.test_scenarios(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text not null default '',
  precondition text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (id, project_id, scenario_id),
  foreign key (scenario_id, project_id)
    references public.test_scenarios(id, project_id)
);

create unique index test_cases_scenario_name_unique_idx
  on public.test_cases (scenario_id, lower(btrim(name)));
create index test_cases_project_id_idx on public.test_cases (project_id);
create index test_cases_scenario_id_idx on public.test_cases (scenario_id);

create table public.test_steps (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references public.test_cases(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  description text not null check (btrim(description) <> ''),
  expected_result text not null check (btrim(expected_result) <> ''),
  unique (test_case_id, step_number)
);

create index test_steps_test_case_id_idx on public.test_steps (test_case_id, step_number);

create table public.test_executions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  scenario_id uuid not null references public.test_scenarios(id) on delete restrict,
  test_case_id uuid not null references public.test_cases(id) on delete restrict,
  overall_status text not null check (overall_status in ('Passed', 'Failed', 'Blocked', 'No Run')),
  execution_mode text not null default 'detailed' check (execution_mode in ('quick', 'detailed')),
  notes text not null default '',
  executed_by uuid references public.profiles(id) on delete set null,
  executed_at timestamptz not null default now(),
  foreign key (test_case_id, project_id, scenario_id)
    references public.test_cases(id, project_id, scenario_id)
);

create index test_executions_test_case_date_idx
  on public.test_executions (test_case_id, executed_at desc);
create index test_executions_project_id_idx on public.test_executions (project_id);
create index test_executions_scenario_id_idx on public.test_executions (scenario_id);
create index test_executions_executed_by_idx on public.test_executions (executed_by);

create table public.test_step_results (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.test_executions(id) on delete cascade,
  test_step_id uuid references public.test_steps(id) on delete set null,
  step_number integer not null check (step_number > 0),
  step_description text not null check (btrim(step_description) <> ''),
  expected_result text not null,
  actual_result text not null default '',
  status text not null check (status in ('Passed', 'Failed', 'Blocked', 'No Run')),
  unique (execution_id, step_number)
);

create index test_step_results_execution_id_idx
  on public.test_step_results (execution_id, step_number);
create index test_step_results_test_step_id_idx on public.test_step_results (test_step_id);

create table public.defects (
  id uuid primary key default gen_random_uuid(),
  defect_number bigint generated always as identity unique,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  steps_to_reproduce text not null default '',
  expected_result text not null default '',
  actual_result text not null default '',
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Ready for Retest', 'Closed', 'Reopened')),
  severity text not null default 'Medium' check (severity in ('Critical', 'High', 'Medium', 'Low')),
  priority text not null default 'Medium' check (priority in ('Critical', 'High', 'Medium', 'Low')),
  reporter_id uuid references public.profiles(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  scenario_id uuid references public.test_scenarios(id) on delete set null,
  test_case_id uuid references public.test_cases(id) on delete set null,
  execution_id uuid references public.test_executions(id) on delete set null,
  test_step_id uuid references public.test_steps(id) on delete set null,
  test_step_number integer check (test_step_number is null or test_step_number > 0),
  external_system text check (external_system is null or external_system in ('Jira', 'Azure DevOps', 'GitHub Issues', 'Other')),
  external_issue_key text,
  external_issue_url text check (external_issue_url is null or external_issue_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create index defects_project_id_idx on public.defects (project_id);
create index defects_scenario_id_idx on public.defects (scenario_id);
create index defects_test_case_id_idx on public.defects (test_case_id);
create index defects_execution_id_idx on public.defects (execution_id);
create index defects_status_priority_idx on public.defects (status, priority);
create index defects_assignee_id_idx on public.defects (assignee_id);
create index defects_reporter_id_idx on public.defects (reporter_id);
create unique index defects_external_reference_unique_idx
  on public.defects (external_system, external_issue_key)
  where external_system is not null and external_issue_key is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger test_scenarios_set_updated_at before update on public.test_scenarios
for each row execute function public.set_updated_at();
create trigger test_cases_set_updated_at before update on public.test_cases
for each row execute function public.set_updated_at();
create trigger defects_set_updated_at before update on public.defects
for each row execute function public.set_updated_at();

create or replace function public.protect_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_admin boolean := false;
  remaining_admins integer;
begin
  if old.role = 'Admin' and old.status = 'Active' then
    if tg_op = 'DELETE' then
      removes_admin := true;
    else
      removes_admin := new.role <> 'Admin' or new.status <> 'Active';
    end if;
  end if;

  if removes_admin then
    select count(*) into remaining_admins
    from public.profiles
    where id <> old.id and role = 'Admin' and status = 'Active';

    if remaining_admins = 0 then
      raise exception 'TestNest must keep at least one Active Admin.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_last_active_admin
before update of role, status or delete on public.profiles
for each row execute function public.protect_last_active_admin();

revoke all on function public.protect_last_active_admin() from public;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid() and status = 'Active';
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'Active'
  );
$$;

create or replace function public.has_profile_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_profile_role() = any(allowed_roles), false);
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.is_active_user() from public;
revoke all on function public.has_profile_role(text[]) from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_profile_role(text[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.test_scenarios enable row level security;
alter table public.test_cases enable row level security;
alter table public.test_steps enable row level security;
alter table public.test_executions enable row level security;
alter table public.test_step_results enable row level security;
alter table public.defects enable row level security;

create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.has_profile_role(array['Admin']));

create policy profiles_insert_admin on public.profiles
for insert to authenticated
with check (public.has_profile_role(array['Admin']));

create policy profiles_update_admin on public.profiles
for update to authenticated
using (public.has_profile_role(array['Admin']))
with check (public.has_profile_role(array['Admin']));

create policy profiles_delete_admin on public.profiles
for delete to authenticated
using (public.has_profile_role(array['Admin']));

create policy projects_select_active on public.projects
for select to authenticated using (public.is_active_user());
create policy projects_insert_leads on public.projects
for insert to authenticated
with check (
  public.has_profile_role(array['Admin', 'QA Lead']) and created_by = auth.uid()
);
create policy projects_update_leads on public.projects
for update to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead']))
with check (
  public.has_profile_role(array['Admin', 'QA Lead']) and updated_by = auth.uid()
);
create policy projects_delete_admin on public.projects
for delete to authenticated using (public.has_profile_role(array['Admin']));

create policy test_scenarios_select_active on public.test_scenarios
for select to authenticated using (public.is_active_user());
create policy test_scenarios_insert_leads on public.test_scenarios
for insert to authenticated
with check (
  public.has_profile_role(array['Admin', 'QA Lead']) and created_by = auth.uid()
);
create policy test_scenarios_update_leads on public.test_scenarios
for update to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead']))
with check (
  public.has_profile_role(array['Admin', 'QA Lead']) and updated_by = auth.uid()
);
create policy test_scenarios_delete_leads on public.test_scenarios
for delete to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead']));

create policy test_cases_select_active on public.test_cases
for select to authenticated using (public.is_active_user());
create policy test_cases_insert_authors on public.test_cases
for insert to authenticated
with check (
  public.has_profile_role(array['Admin', 'QA Lead', 'Tester']) and created_by = auth.uid()
);
create policy test_cases_update_authors on public.test_cases
for update to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead', 'Tester']))
with check (
  public.has_profile_role(array['Admin', 'QA Lead', 'Tester']) and updated_by = auth.uid()
);
create policy test_cases_delete_leads on public.test_cases
for delete to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead']));

create policy test_steps_select_active on public.test_steps
for select to authenticated using (public.is_active_user());
create policy test_steps_insert_authors on public.test_steps
for insert to authenticated
with check (public.has_profile_role(array['Admin', 'QA Lead', 'Tester']));
create policy test_steps_update_authors on public.test_steps
for update to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead', 'Tester']))
with check (public.has_profile_role(array['Admin', 'QA Lead', 'Tester']));
create policy test_steps_delete_leads on public.test_steps
for delete to authenticated
using (public.has_profile_role(array['Admin', 'QA Lead']));

create policy test_executions_select_active on public.test_executions
for select to authenticated using (public.is_active_user());
create policy test_executions_insert_executors on public.test_executions
for insert to authenticated
with check (
  public.has_profile_role(array['Admin', 'QA Lead', 'Tester'])
  and executed_by = auth.uid()
);

create policy test_step_results_select_active on public.test_step_results
for select to authenticated using (public.is_active_user());
create policy test_step_results_insert_owner on public.test_step_results
for insert to authenticated
with check (
  public.has_profile_role(array['Admin', 'QA Lead', 'Tester'])
  and exists (
    select 1 from public.test_executions
    where test_executions.id = test_step_results.execution_id
      and test_executions.executed_by = auth.uid()
  )
);

create policy defects_select_active on public.defects
for select to authenticated using (public.is_active_user());
create policy defects_insert_reporters on public.defects
for insert to authenticated
with check (
  public.has_profile_role(array['Admin', 'QA Lead', 'Tester'])
  and created_by = auth.uid()
  and reporter_id = auth.uid()
);
create policy defects_update_authorized on public.defects
for update to authenticated
using (
  public.has_profile_role(array['Admin', 'QA Lead'])
  or (
    public.has_profile_role(array['Tester', 'Developer'])
    and (reporter_id = auth.uid() or assignee_id = auth.uid())
  )
)
with check (
  public.has_profile_role(array['Admin', 'QA Lead'])
  or (
    public.has_profile_role(array['Tester', 'Developer'])
    and (reporter_id = auth.uid() or assignee_id = auth.uid())
  )
);
create policy defects_delete_admin on public.defects
for delete to authenticated using (public.has_profile_role(array['Admin']));
