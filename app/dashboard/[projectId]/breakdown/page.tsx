import { createClient } from "@/lib/supabase/server";
import {
  seedBreakdownTaxonomy,
  listElementCategories,
  listElements,
  listCharacters,
  listPeople,
  listOrganizations,
  listJobs,
} from "@/lib/breakdown/data";
import { listScripts } from "@/lib/scripts/data";
import { BreakdownTabs } from "@/components/breakdown/breakdown-tabs";
import { ElementsTab } from "@/components/breakdown/elements-tab";
import { CharactersTab } from "@/components/breakdown/characters-tab";
import { PeopleTab } from "@/components/breakdown/people-tab";
import { OrganizationsTab } from "@/components/breakdown/organizations-tab";
import { JobQueuePanel } from "@/components/breakdown/job-queue-panel";
import { JobQueuePoller } from "@/components/breakdown/job-queue-poller";
import { RunAiControl } from "@/components/breakdown/run-ai-control";
import {
  createElementAction,
  createCharacterAction,
  createOrganizationAction,
  createPersonAction,
  castPersonAction,
  mergeCharacterAction,
} from "./actions";

/**
 * Breakdown catalog page — shows Elements / Characters / People / Orgs tabs,
 * a Run-AI control, and an async job-queue panel with live polling.
 * Seeds the taxonomy on every load (idempotent: no-ops if already seeded).
 * All data fetches happen server-side; client components handle interactivity.
 */
export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Idempotent seed — safe on every page load
  await seedBreakdownTaxonomy(supabase as never, projectId);

  // Parallel data fetch (scripts uses its own internal client)
  const [categories, elements, characters, people, organizations, jobs, scripts] =
    await Promise.all([
      listElementCategories(supabase as never, projectId),
      listElements(supabase as never, projectId),
      listCharacters(supabase as never, projectId),
      listPeople(supabase as never, projectId),
      listOrganizations(supabase as never, projectId),
      listJobs(supabase as never, projectId),
      listScripts(projectId),
    ]);

  const hasActiveJobs = jobs.some(
    (j) => j.status === "queued" || j.status === "running",
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="font-display text-xl font-extrabold tracking-[-0.3px] text-[var(--tx)]">
          Breakdown
        </h1>
        <p className="text-sm text-[var(--tx-3)]">
          Manage the production catalog — elements, characters, people, and
          organizations.
        </p>
      </header>

      {/* Run AI breakdown control — sage→amethyst AI surface */}
      <RunAiControl projectId={projectId} scripts={scripts} />

      {/* Job queue panel */}
      {jobs.length > 0 && (
        <section aria-label="AI job queue">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            Job queue
          </h2>
          <JobQueuePanel projectId={projectId} jobs={jobs} />
        </section>
      )}

      {/* Polling: refreshes the page while any job is active */}
      <JobQueuePoller hasActiveJobs={hasActiveJobs} />

      {/* Tabbed catalog */}
      <BreakdownTabs
        elements={
          <ElementsTab
            projectId={projectId}
            categories={categories}
            elements={elements}
            createElementAction={createElementAction}
          />
        }
        characters={
          <CharactersTab
            projectId={projectId}
            characters={characters}
            people={people}
            createCharacterAction={createCharacterAction}
            mergeCharacterAction={mergeCharacterAction}
            castPersonAction={castPersonAction}
          />
        }
        people={
          <PeopleTab
            projectId={projectId}
            people={people}
            organizations={organizations}
            createPersonAction={createPersonAction}
          />
        }
        organizations={
          <OrganizationsTab
            projectId={projectId}
            organizations={organizations}
            createOrganizationAction={createOrganizationAction}
          />
        }
      />
    </main>
  );
}
