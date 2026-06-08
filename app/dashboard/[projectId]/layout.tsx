import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { createClient } from "@/lib/supabase/server";
import { getProject, listProjects } from "@/lib/projects/data";

/**
 * Project-scoped shell — wraps all /dashboard/[projectId]/** routes.
 *
 * Composes:
 * - SidebarProvider (manages open/collapsed state + mobile sheet)
 * - AppSidebar (rail: brandmark + filament + phase-ordered nav + AI entry)
 * - SidebarInset (main content area; z-[2] sits above the grain overlay)
 * - CommandPalette (uncontrolled — listens for global ⌘K / Ctrl+K)
 *
 * Each child page is responsible for its own <TopBar> so titles are
 * page-specific. SidebarTrigger is included inside SidebarInset so it
 * is reachable on mobile when the sidebar is collapsed to offcanvas.
 *
 * params is a Promise per Next.js 16 App Router convention.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Trashed projects are not reachable; their workspace 404s until restored.
  // (Archived projects stay openable — archiving only shelves them from the list.)
  const current = await getProject(supabase as never, projectId);
  if (!current || current.deleted_at) notFound();

  const projects = await listProjects(supabase as never, "active");

  return (
    <SidebarProvider>
      <AppSidebar
        projectId={projectId}
        projects={projects}
        currentProjectId={projectId}
      />
      <SidebarInset className="relative z-[2]">
        {/* Mobile sidebar trigger — visible only when sidebar is collapsed */}
        <div className="flex items-center border-b border-[var(--line)] px-2 py-1 md:hidden">
          <SidebarTrigger aria-label="Open navigation" />
        </div>
        {children}
      </SidebarInset>
      {/* ⌘K palette — global keyboard listener; renders as a dialog */}
      <CommandPalette projectId={projectId} />
    </SidebarProvider>
  );
}
