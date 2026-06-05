-- ============================================================================
-- Phase 4: Budget lines (manual or graph-bound quantity; manual or global rate)
--          + stackable line↔fringe junction.
-- ============================================================================
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  account_id uuid not null references public.budget_accounts(id) on delete cascade,
  description text not null default '',
  unit text,
  ordinal int not null default 0,
  quantity numeric,                        -- manual quantity (when not derived)
  quantity_source jsonb,                   -- { kind, params } soft binding; null => manual
  rate numeric,                            -- manual rate
  rate_global_id uuid references public.budget_globals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.budget_line_fringes (
  budget_id uuid not null references public.budgets(id) on delete cascade,
  line_id uuid not null references public.budget_lines(id) on delete cascade,
  fringe_id uuid not null references public.fringes(id) on delete cascade,
  primary key (line_id, fringe_id)
);
create index budget_lines_budget_id_idx on public.budget_lines(budget_id);
create index budget_lines_account_id_idx on public.budget_lines(account_id);
create index budget_lines_rate_global_idx on public.budget_lines(rate_global_id);
create index budget_line_fringes_line_idx on public.budget_line_fringes(line_id);
create index budget_line_fringes_fringe_idx on public.budget_line_fringes(fringe_id);

alter table public.budget_lines enable row level security;
alter table public.budget_line_fringes enable row level security;

-- budget_lines: budget owned AND account in caller's project AND (rate_global null OR owned)
create policy "budget_lines - select" on public.budget_lines for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_lines.budget_id and p.owner_id = auth.uid()));
create policy "budget_lines - insert" on public.budget_lines for insert with check (
  exists (select 1 from public.budget_accounts a join public.budgets b on b.id = a.budget_id join public.projects p on p.id = b.project_id where a.id = budget_lines.account_id and b.id = budget_lines.budget_id and p.owner_id = auth.uid())
  and (rate_global_id is null or exists (select 1 from public.budget_globals g join public.budgets b2 on b2.id = g.budget_id join public.projects p2 on p2.id = b2.project_id where g.id = budget_lines.rate_global_id and p2.owner_id = auth.uid())));
create policy "budget_lines - update" on public.budget_lines for update using (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_lines.budget_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.budget_accounts a join public.budgets b on b.id = a.budget_id join public.projects p on p.id = b.project_id where a.id = budget_lines.account_id and b.id = budget_lines.budget_id and p.owner_id = auth.uid())
  and (rate_global_id is null or exists (select 1 from public.budget_globals g join public.budgets b2 on b2.id = g.budget_id join public.projects p2 on p2.id = b2.project_id where g.id = budget_lines.rate_global_id and p2.owner_id = auth.uid())));
create policy "budget_lines - delete" on public.budget_lines for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_lines.budget_id and p.owner_id = auth.uid()));

-- budget_line_fringes: BOTH line and fringe must belong to the caller
create policy "budget_line_fringes - select" on public.budget_line_fringes for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_line_fringes.budget_id and p.owner_id = auth.uid()));
create policy "budget_line_fringes - insert" on public.budget_line_fringes for insert with check (
  exists (select 1 from public.budget_lines l join public.budgets b on b.id = l.budget_id join public.projects p on p.id = b.project_id where l.id = budget_line_fringes.line_id and p.owner_id = auth.uid())
  and exists (select 1 from public.fringes f join public.budgets b2 on b2.id = f.budget_id join public.projects p2 on p2.id = b2.project_id where f.id = budget_line_fringes.fringe_id and p2.owner_id = auth.uid()));
create policy "budget_line_fringes - delete" on public.budget_line_fringes for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_line_fringes.budget_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.budget_lines to authenticated;
grant select, insert, delete on public.budget_line_fringes to authenticated;
create trigger budget_lines_set_updated_at before update on public.budget_lines for each row execute function extensions.moddatetime(updated_at);
