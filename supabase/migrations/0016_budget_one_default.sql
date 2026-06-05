-- ============================================================================
-- Phase 4 fix: at most one default budget per project (getOrCreateDefaultBudget
-- is called concurrently from the page's parallel reads; the unique index makes
-- the get-or-create race-safe — losers get 23505 and re-read).
-- ============================================================================
create unique index budgets_one_default_per_project
  on public.budgets (project_id)
  where is_default;
