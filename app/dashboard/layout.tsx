/**
 * Dashboard-level chrome wrapper — covers the project-list page (/dashboard).
 *
 * The project-list page does NOT get a project sidebar (no projectId in scope).
 * This thin wrapper keeps the surface above the root grain overlay (z-[2]) and
 * ensures the page fills at least the full viewport height.
 *
 * The [projectId] sub-layout (app/dashboard/[projectId]/layout.tsx) provides
 * the full SidebarProvider + AppSidebar shell for project-scoped routes.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="relative z-[2] min-h-screen">{children}</div>;
}
