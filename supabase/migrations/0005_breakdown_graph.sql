-- ============================================================================
-- Phase 2: Breakdown graph entities (project-scoped, owner-based RLS mirroring
-- Phase 1). Characters + people + orgs + element catalog + the dept/category hinge.
-- ============================================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  code text,
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.element_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  code text,
  department_id uuid references public.departments(id) on delete set null,
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null default 'vendor'
    check (type in ('production_company','agency','vendor','payroll','insurer','other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  org_id uuid references public.organizations(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  primary_name text not null,
  aliases text[] not null default '{}',
  description text,
  cast_person_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.elements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.element_categories(id) on delete restrict,
  name text not null,
  description text,
  vendor_org_id uuid references public.organizations(id) on delete set null,
  estimated_cost numeric, -- dormant budget seam (Phase 4); not surfaced in Phase 2 UI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes on FKs / hot paths
create index departments_project_id_idx on public.departments(project_id);
create index element_categories_project_id_idx on public.element_categories(project_id);
create index element_categories_department_id_idx on public.element_categories(department_id);
create index organizations_project_id_idx on public.organizations(project_id);
create index people_project_id_idx on public.people(project_id);
create index people_org_id_idx on public.people(org_id);
create index characters_project_id_idx on public.characters(project_id);
create index characters_cast_person_id_idx on public.characters(cast_person_id);
create index elements_project_id_idx on public.elements(project_id);
create index elements_category_id_idx on public.elements(category_id);
create index elements_vendor_org_id_idx on public.elements(vendor_org_id);

-- ============================================================================
-- RLS: project-scoped (owner-based), four per-op policies per table.
-- ============================================================================
alter table public.departments enable row level security;
alter table public.element_categories enable row level security;
alter table public.organizations enable row level security;
alter table public.people enable row level security;
alter table public.characters enable row level security;
alter table public.elements enable row level security;

-- departments: project-scoped.
create policy "departments - select" on public.departments
  for select using (
    exists (select 1 from public.projects p where p.id = departments.project_id and p.owner_id = auth.uid())
  );
create policy "departments - insert" on public.departments
  for insert with check (
    exists (select 1 from public.projects p where p.id = departments.project_id and p.owner_id = auth.uid())
  );
create policy "departments - update" on public.departments
  for update using (
    exists (select 1 from public.projects p where p.id = departments.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = departments.project_id and p.owner_id = auth.uid())
  );
create policy "departments - delete" on public.departments
  for delete using (
    exists (select 1 from public.projects p where p.id = departments.project_id and p.owner_id = auth.uid())
  );

-- element_categories: project-scoped.
create policy "element_categories - select" on public.element_categories
  for select using (
    exists (select 1 from public.projects p where p.id = element_categories.project_id and p.owner_id = auth.uid())
  );
create policy "element_categories - insert" on public.element_categories
  for insert with check (
    exists (select 1 from public.projects p where p.id = element_categories.project_id and p.owner_id = auth.uid())
  );
create policy "element_categories - update" on public.element_categories
  for update using (
    exists (select 1 from public.projects p where p.id = element_categories.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = element_categories.project_id and p.owner_id = auth.uid())
  );
create policy "element_categories - delete" on public.element_categories
  for delete using (
    exists (select 1 from public.projects p where p.id = element_categories.project_id and p.owner_id = auth.uid())
  );

-- organizations: project-scoped.
create policy "organizations - select" on public.organizations
  for select using (
    exists (select 1 from public.projects p where p.id = organizations.project_id and p.owner_id = auth.uid())
  );
create policy "organizations - insert" on public.organizations
  for insert with check (
    exists (select 1 from public.projects p where p.id = organizations.project_id and p.owner_id = auth.uid())
  );
create policy "organizations - update" on public.organizations
  for update using (
    exists (select 1 from public.projects p where p.id = organizations.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = organizations.project_id and p.owner_id = auth.uid())
  );
create policy "organizations - delete" on public.organizations
  for delete using (
    exists (select 1 from public.projects p where p.id = organizations.project_id and p.owner_id = auth.uid())
  );

-- people: project-scoped.
create policy "people - select" on public.people
  for select using (
    exists (select 1 from public.projects p where p.id = people.project_id and p.owner_id = auth.uid())
  );
create policy "people - insert" on public.people
  for insert with check (
    exists (select 1 from public.projects p where p.id = people.project_id and p.owner_id = auth.uid())
  );
create policy "people - update" on public.people
  for update using (
    exists (select 1 from public.projects p where p.id = people.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = people.project_id and p.owner_id = auth.uid())
  );
create policy "people - delete" on public.people
  for delete using (
    exists (select 1 from public.projects p where p.id = people.project_id and p.owner_id = auth.uid())
  );

-- characters: project-scoped.
create policy "characters - select" on public.characters
  for select using (
    exists (select 1 from public.projects p where p.id = characters.project_id and p.owner_id = auth.uid())
  );
create policy "characters - insert" on public.characters
  for insert with check (
    exists (select 1 from public.projects p where p.id = characters.project_id and p.owner_id = auth.uid())
  );
create policy "characters - update" on public.characters
  for update using (
    exists (select 1 from public.projects p where p.id = characters.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = characters.project_id and p.owner_id = auth.uid())
  );
create policy "characters - delete" on public.characters
  for delete using (
    exists (select 1 from public.projects p where p.id = characters.project_id and p.owner_id = auth.uid())
  );

-- elements: project-scoped.
create policy "elements - select" on public.elements
  for select using (
    exists (select 1 from public.projects p where p.id = elements.project_id and p.owner_id = auth.uid())
  );
create policy "elements - insert" on public.elements
  for insert with check (
    exists (select 1 from public.projects p where p.id = elements.project_id and p.owner_id = auth.uid())
  );
create policy "elements - update" on public.elements
  for update using (
    exists (select 1 from public.projects p where p.id = elements.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = elements.project_id and p.owner_id = auth.uid())
  );
create policy "elements - delete" on public.elements
  for delete using (
    exists (select 1 from public.projects p where p.id = elements.project_id and p.owner_id = auth.uid())
  );

-- ============================================================================
-- Grants: signed-in users only; RLS policies above gate every row.
-- ============================================================================
grant select, insert, update, delete on public.departments to authenticated;
grant select, insert, update, delete on public.element_categories to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, update, delete on public.elements to authenticated;

-- ============================================================================
-- updated_at auto-bump triggers via moddatetime (extension already installed).
-- ============================================================================
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function extensions.moddatetime(updated_at);

create trigger element_categories_set_updated_at
  before update on public.element_categories
  for each row execute function extensions.moddatetime(updated_at);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function extensions.moddatetime(updated_at);

create trigger people_set_updated_at
  before update on public.people
  for each row execute function extensions.moddatetime(updated_at);

create trigger characters_set_updated_at
  before update on public.characters
  for each row execute function extensions.moddatetime(updated_at);

create trigger elements_set_updated_at
  before update on public.elements
  for each row execute function extensions.moddatetime(updated_at);
