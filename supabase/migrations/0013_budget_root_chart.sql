-- ============================================================================
-- Phase 4: Budget root (versions seam) + flexible chart + globals + fringes.
-- ============================================================================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default 'Budget',
  is_default boolean not null default true,
  contingency_percent numeric not null default 0,
  contingency_basis text not null default 'btl' check (contingency_basis in ('btl','total','none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.budget_accounts (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  parent_account_id uuid references public.budget_accounts(id) on delete set null,
  code text not null,
  name text not null,
  section text not null default 'btl' check (section in ('atl','btl','post','other')),
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.budget_globals (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  name text not null,
  kind text not null default 'rate' check (kind in ('rate','percent')),
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.fringes (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  name text not null,
  percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budgets_project_id_idx on public.budgets(project_id);
create index budget_accounts_budget_id_idx on public.budget_accounts(budget_id);
create index budget_accounts_parent_idx on public.budget_accounts(parent_account_id);
create index budget_globals_budget_id_idx on public.budget_globals(budget_id);
create index fringes_budget_id_idx on public.fringes(budget_id);

alter table public.budgets enable row level security;
alter table public.budget_accounts enable row level security;
alter table public.budget_globals enable row level security;
alter table public.fringes enable row level security;

-- budgets: project-scoped (4 policies)
create policy "budgets - select" on public.budgets for select using (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));
create policy "budgets - insert" on public.budgets for insert with check (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));
create policy "budgets - update" on public.budgets for update using (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));
create policy "budgets - delete" on public.budgets for delete using (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));

-- budget_accounts: budget owned AND (parent null OR parent in same caller's project)
-- NOTE: parent_account_id is a self-referential FK on budget_accounts. Checking it
-- directly in the RLS policy would cause infinite recursion (the policy evaluates itself
-- when querying the parent row). Instead we use a SECURITY DEFINER helper that bypasses
-- RLS for the narrow ownership check on the parent row, breaking the cycle.
create or replace function public.budget_account_parent_owned_by(
  p_parent_id uuid,
  p_user_id uuid
) returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (
    select 1
    from public.budget_accounts a
    join public.budgets b on b.id = a.budget_id
    join public.projects p on p.id = b.project_id
    where a.id = p_parent_id
      and p.owner_id = p_user_id
  );
$$;

create policy "budget_accounts - select" on public.budget_accounts for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid()));
create policy "budget_accounts - insert" on public.budget_accounts for insert with check (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid())
  and (parent_account_id is null or public.budget_account_parent_owned_by(parent_account_id, auth.uid())));
create policy "budget_accounts - update" on public.budget_accounts for update using (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid())
  and (parent_account_id is null or public.budget_account_parent_owned_by(parent_account_id, auth.uid())));
create policy "budget_accounts - delete" on public.budget_accounts for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid()));

-- budget_globals + fringes: budget-scoped (4 policies each)
create policy "budget_globals - select" on public.budget_globals for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "budget_globals - insert" on public.budget_globals for insert with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "budget_globals - update" on public.budget_globals for update using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "budget_globals - delete" on public.budget_globals for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "fringes - select" on public.fringes for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));
create policy "fringes - insert" on public.fringes for insert with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));
create policy "fringes - update" on public.fringes for update using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));
create policy "fringes - delete" on public.fringes for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));

grant execute on function public.budget_account_parent_owned_by(uuid, uuid) to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.budget_accounts to authenticated;
grant select, insert, update, delete on public.budget_globals to authenticated;
grant select, insert, update, delete on public.fringes to authenticated;
create trigger budgets_set_updated_at before update on public.budgets for each row execute function extensions.moddatetime(updated_at);
create trigger budget_accounts_set_updated_at before update on public.budget_accounts for each row execute function extensions.moddatetime(updated_at);
create trigger budget_globals_set_updated_at before update on public.budget_globals for each row execute function extensions.moddatetime(updated_at);
create trigger fringes_set_updated_at before update on public.fringes for each row execute function extensions.moddatetime(updated_at);
