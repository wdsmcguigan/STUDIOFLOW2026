"use client";

/**
 * ProjectSwitcher — sidebar project selector dropdown.
 *
 * Interaction ported from legacy/components/layout/app-sidebar.tsx ~156–199.
 * Design and types replaced:
 *   - v0 inline-dropdown → shadcn DropdownMenu (Base UI backed, render= pattern)
 *   - v0 gradient avatar (blue→purple) → brand-soft ember initial avatar
 *   - v0 Project shape (with moduleVisibility etc) → typed Project from lib/projects/schema
 *   - v0 mock data → props fed from the server layout
 *
 * Architecture: pure presentational client component.
 * Data is fetched server-side in app/dashboard/[projectId]/layout.tsx
 * and passed as props — no data calls inside this file.
 *
 * Accessibility:
 *   - Trigger has an accessible name ("Switch project — {title}") so screen readers
 *     convey both the purpose and the current value.
 *   - Check mark is supplemented with a visually-hidden text label (not color-only).
 *   - Focus ring uses --ring token (amber, WCAG-passing on both Kraft/Umber surfaces).
 *   - Keyboard: Enter/Space opens, Arrow keys navigate, Escape closes (Base UI built-in).
 */

import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import type { Project } from "@/lib/projects/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Initial-avatar tile — first letter of title on a brand-soft background.
 * Matches the "amber family" action token rule (no AI gradient here).
 */
function ProjectAvatar({ title }: { title: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-md text-[12px] font-extrabold leading-none select-none"
      style={{
        background: "var(--brand-soft)",
        color: "var(--brand)",
        border: "1px solid var(--brand-line)",
      }}
    >
      {title.charAt(0).toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectSwitcherProps {
  projects: Project[];
  currentProjectId: string;
}

// ---------------------------------------------------------------------------
// ProjectSwitcher
// ---------------------------------------------------------------------------

export function ProjectSwitcher({
  projects,
  currentProjectId,
}: ProjectSwitcherProps) {
  const currentProject = projects.find((p) => p.id === currentProjectId);

  // If current project is somehow not in the list (e.g. RLS race), fall back gracefully.
  const displayTitle = currentProject?.title ?? "Select project";
  const displayStatus = currentProject?.status.replace(/-/g, " ") ?? "";

  return (
    <DropdownMenu>
      {/*
       * Trigger: real button element (DropdownMenuTrigger renders MenuPrimitive.Trigger
       * which is a <button> by default in Base UI — no asChild/render needed here).
       * aria-label gives screen readers the purpose + current project.
       */}
      <DropdownMenuTrigger
        aria-label={`Switch project — ${displayTitle}`}
        className="group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors
          hover:bg-[var(--brand-soft)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1
          data-popup-open:bg-[var(--brand-soft)]"
      >
        <ProjectAvatar title={displayTitle} />

        <div className="min-w-0 flex-1">
          {/* Title */}
          <div
            className="truncate text-[13px] font-semibold leading-snug"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--tx)",
            }}
          >
            {displayTitle}
          </div>

          {/* Status — muted, formatted as readable text */}
          {displayStatus && (
            <div
              className="truncate text-[10px] leading-snug capitalize"
              style={{ color: "var(--tx-3)" }}
            >
              {displayStatus}
            </div>
          )}
        </div>

        {/* Chevron — rotates when menu is open via Base UI data attribute */}
        <ChevronDown
          className="size-3.5 shrink-0 transition-transform group-data-popup-open:rotate-180"
          aria-hidden="true"
          style={{ color: "var(--tx-3)" }}
        />
      </DropdownMenuTrigger>

      {/*
       * Content: matches trigger width, opens below.
       * Surface uses --s3 (popover token) with --line hairline ring.
       * Max-height keeps it usable with many projects; internal scroll via Base UI.
       */}
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="p-1"
        style={
          {
            background: "var(--s3)",
            border: "1px solid var(--line)",
          } as React.CSSProperties
        }
      >
        {projects.map((project) => {
          const isActive = project.id === currentProjectId;
          const statusLabel = project.status.replace(/-/g, " ");

          return (
            /*
             * Each item is a DropdownMenuItem that renders a Next Link.
             * Base UI's render= prop forwards all item props (including
             * data-highlighted, data-disabled, aria-*) onto the Link element.
             * This keeps keyboard navigation intact while enabling client-side routing.
             */
            <DropdownMenuItem
              key={project.id}
              render={<Link href={`/dashboard/${project.id}`} />}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm
                focus:bg-[var(--brand-soft)] focus:text-[var(--brand-on)]
                data-highlighted:bg-[var(--brand-soft)] data-highlighted:text-[var(--brand-on)]"
              style={{ color: "var(--tx)" }}
            >
              <ProjectAvatar title={project.title} />

              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-medium leading-snug"
                  style={{ color: "var(--tx)" }}
                >
                  {project.title}
                </div>
                <div
                  className="truncate text-[10px] leading-snug capitalize"
                  style={{ color: "var(--tx-3)" }}
                >
                  {statusLabel}
                </div>
              </div>

              {/*
               * Active check — paired with a visually-hidden text span so the
               * indicator is not color-only (WCAG 1.4.1 non-text contrast).
               */}
              {isActive && (
                <span className="flex items-center gap-1" aria-label="current project">
                  <Check
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                    style={{ color: "var(--brand)" }}
                  />
                  <span className="sr-only">current</span>
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
