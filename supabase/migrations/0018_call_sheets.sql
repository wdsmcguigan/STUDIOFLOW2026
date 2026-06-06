-- ============================================================================
-- Phase 5: Call sheet header (1:1 shoot_day) + cascaded per-day calls.
-- ============================================================================
create table public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null unique references public.shoot_days(id) on delete cascade,
  general_call_time text,
  weather_note text,
  hospital_name text,
  hospital_address text,
  notes text,
  revision int not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.crew_dept_calls (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  department text not null,
  call_time text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, department)
);
create table public.crew_day_calls (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  call_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, crew_member_id)
);
create table public.cast_day_calls (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  call_time text,
  makeup_time text,
  wardrobe_time text,
  on_set_time text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, person_id)
);

create index call_sheets_shoot_day_idx on public.call_sheets(shoot_day_id);
create index crew_dept_calls_shoot_day_idx on public.crew_dept_calls(shoot_day_id);
create index crew_day_calls_shoot_day_idx on public.crew_day_calls(shoot_day_id);
create index crew_day_calls_crew_member_idx on public.crew_day_calls(crew_member_id);
create index cast_day_calls_shoot_day_idx on public.cast_day_calls(shoot_day_id);
create index cast_day_calls_person_idx on public.cast_day_calls(person_id);

alter table public.call_sheets enable row level security;
alter table public.crew_dept_calls enable row level security;
alter table public.crew_day_calls enable row level security;
alter table public.cast_day_calls enable row level security;

-- helper predicate (inlined): shoot_day belongs to caller
-- call_sheets: shoot_day-scoped (4 policies)
create policy "call_sheets - select" on public.call_sheets for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));
create policy "call_sheets - insert" on public.call_sheets for insert with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));
create policy "call_sheets - update" on public.call_sheets for update using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));
create policy "call_sheets - delete" on public.call_sheets for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));

-- crew_dept_calls: shoot_day-scoped (4 policies)
create policy "crew_dept_calls - select" on public.crew_dept_calls for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_dept_calls - insert" on public.crew_dept_calls for insert with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_dept_calls - update" on public.crew_dept_calls for update using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_dept_calls - delete" on public.crew_dept_calls for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));

-- crew_day_calls: BOTH shoot_day and crew_member must belong to the caller (two-FK)
create policy "crew_day_calls - select" on public.crew_day_calls for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_day_calls - insert" on public.crew_day_calls for insert with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.crew_members c join public.projects p2 on p2.id = c.project_id where c.id = crew_day_calls.crew_member_id and p2.owner_id = auth.uid()));
create policy "crew_day_calls - update" on public.crew_day_calls for update using (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.crew_members c join public.projects p2 on p2.id = c.project_id where c.id = crew_day_calls.crew_member_id and p2.owner_id = auth.uid()));
create policy "crew_day_calls - delete" on public.crew_day_calls for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid()));

-- cast_day_calls: BOTH shoot_day and person must belong to the caller (two-FK)
create policy "cast_day_calls - select" on public.cast_day_calls for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "cast_day_calls - insert" on public.cast_day_calls for insert with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_calls.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_calls - update" on public.cast_day_calls for update using (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_calls.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_calls - delete" on public.cast_day_calls for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.call_sheets to authenticated;
grant select, insert, update, delete on public.crew_dept_calls to authenticated;
grant select, insert, update, delete on public.crew_day_calls to authenticated;
grant select, insert, update, delete on public.cast_day_calls to authenticated;
create trigger call_sheets_set_updated_at before update on public.call_sheets for each row execute function extensions.moddatetime(updated_at);
create trigger crew_dept_calls_set_updated_at before update on public.crew_dept_calls for each row execute function extensions.moddatetime(updated_at);
create trigger crew_day_calls_set_updated_at before update on public.crew_day_calls for each row execute function extensions.moddatetime(updated_at);
create trigger cast_day_calls_set_updated_at before update on public.cast_day_calls for each row execute function extensions.moddatetime(updated_at);
