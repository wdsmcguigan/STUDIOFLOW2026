-- ============================================================================
-- Phase 4: CostEntry — append-only actuals ledger (no UPDATE; correct via offset).
-- ============================================================================
create table public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  account_id uuid not null references public.budget_accounts(id) on delete cascade,
  line_id uuid references public.budget_lines(id) on delete cascade,
  amount numeric not null,
  entry_date date not null,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index cost_entries_budget_id_idx on public.cost_entries(budget_id);
create index cost_entries_account_id_idx on public.cost_entries(account_id);
create index cost_entries_line_id_idx on public.cost_entries(line_id);

alter table public.cost_entries enable row level security;
create policy "cost_entries - select" on public.cost_entries for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = cost_entries.budget_id and p.owner_id = auth.uid()));
create policy "cost_entries - insert" on public.cost_entries for insert with check (
  exists (select 1 from public.budget_accounts a join public.budgets b on b.id = a.budget_id join public.projects p on p.id = b.project_id where a.id = cost_entries.account_id and b.id = cost_entries.budget_id and p.owner_id = auth.uid())
  and (line_id is null or exists (select 1 from public.budget_lines l join public.budgets b2 on b2.id = l.budget_id join public.projects p2 on p2.id = b2.project_id where l.id = cost_entries.line_id and p2.owner_id = auth.uid())));
create policy "cost_entries - delete" on public.cost_entries for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = cost_entries.budget_id and p.owner_id = auth.uid()));
-- NO "cost_entries - update" policy: append-only.
grant select, insert, delete on public.cost_entries to authenticated;  -- NOT update
