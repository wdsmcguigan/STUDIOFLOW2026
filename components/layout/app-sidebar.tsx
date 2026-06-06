"use client";

/**
 * AppSidebar — Grouped phase-ordered navigation rail.
 *
 * Identity rules applied here:
 * - Brandmark: ember "SF" tile (amber→ember gradient fill) + "StudioFlow" wordmark
 *   + tungsten filament hairline (1px amber gradient + soft glow) underneath.
 * - Active item: --brand-soft background + --brand-on text + 3px amber left-spine
 *   with 0 0 9px --brand glow (matches mockup .nav.on::before).
 * - AI Assistant entry: marked with <AIDot /> + --ai-ink color (gradient = AI only;
 *   no sparkle icon; dot + label carry the accessible meaning).
 * - "Soon" items: disabled, 50% opacity, "Soon" badge — not clickable (routes not yet built).
 * - Amber = action/human only. Gradient = AI only. The two never swap jobs.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutList,
  CalendarDays,
  DollarSign,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AIDot } from "@/components/ui/ai-surface";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ProjectSwitcher } from "@/components/layout/project-switcher";
import type { Project } from "@/lib/projects/schema";

// ---------------------------------------------------------------------------
// Nav model
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  /** Whether this group gets the AI Assistant entry appended after its items. */
  appendAI?: boolean;
}

/**
 * Phase-ordered groups (Develop → Plan → Shoot…).
 * Only "Script" has a live route in this slice. All others are `soon: true` stubs —
 * they render as disabled items and do NOT create routes (those ship in their phases).
 */
const GROUPS: NavGroup[] = [
  {
    label: "Develop",
    appendAI: true,
    items: [
      { href: "scripts", label: "Script", icon: FileText },
      { href: "breakdown", label: "Breakdown", icon: LayoutList, soon: true },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "schedule", label: "Schedule", icon: CalendarDays, soon: true },
      { href: "budget", label: "Budget", icon: DollarSign },
      { href: "callsheets", label: "Call Sheets", icon: ClipboardList },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Disabled "Soon" nav item. Presented at 50% opacity with a "Soon" badge. */
function SoonItem({ item }: { item: NavItem }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        disabled
        aria-disabled="true"
        className="cursor-default opacity-50"
      >
        <item.icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{item.label}</span>
        <span
          className="ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{
            borderColor: "var(--line-2)",
            color: "var(--tx-3)",
          }}
        >
          Soon
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Live nav item — active when the current path starts with the item's href.
 *
 * The amber left-spine (3px wide, 0 0 9px --brand glow) is implemented as an
 * absolutely-positioned <span> inside SidebarMenuItem (which is `position: relative`).
 * This matches the mockup's `.nav.on::before` placement exactly, without requiring
 * a CSS pseudo-element (pseudo-elements can't be driven by React state).
 *
 * This sidebar uses Base UI's `render` prop pattern (not Radix `asChild`).
 * Passing `render={<Link href={href} />}` lets SidebarMenuButton forward all its
 * props (className, aria-*, data-*) onto the Next.js Link.
 */
function LiveItem({
  item,
  href,
  active,
}: {
  item: NavItem;
  href: string;
  active: boolean;
}) {
  return (
    <SidebarMenuItem>
      {/* Active amber left-spine — matches mockup .nav.on::before */}
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-[6px] left-0 w-[3px] rounded-r-[3px]"
          style={{
            background: "var(--brand)",
            boxShadow: "0 0 9px var(--brand)",
          }}
        />
      )}
      <SidebarMenuButton
        render={<Link href={href} />}
        isActive={active}
        className={active ? "font-semibold" : ""}
        style={
          active
            ? {
                background: "var(--brand-soft)",
                color: "var(--brand-on)",
              }
            : undefined
        }
      >
        <item.icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** AI Assistant entry — dot-marked, ai-ink color. No href (opens palette in Phase 2). */
function AIAssistantItem() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        style={{ color: "var(--ai-ink)" }}
        aria-label="AI Assistant (coming in Phase 2)"
      >
        <AIDot />
        <span>AI Assistant</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ---------------------------------------------------------------------------
// AppSidebar
// ---------------------------------------------------------------------------

export interface AppSidebarProps {
  /** The project currently in context — used to build absolute hrefs. */
  projectId: string;
  /** All projects accessible to the current user — fed from the server layout. */
  projects: Project[];
  /** The id of the project currently in context — mirrors projectId; explicit for the switcher. */
  currentProjectId: string;
}

/**
 * AppSidebar — the primary navigation rail for project-scoped routes.
 *
 * Must be rendered inside a <SidebarProvider> (done by the project layout).
 * Mobile: the shadcn Sidebar collapses to a Sheet via the SidebarTrigger in TopBar.
 */
export function AppSidebar({ projectId, projects, currentProjectId }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      {/* ------------------------------------------------------------------ */}
      {/* Brandmark: ember SF tile + StudioFlow wordmark + filament hairline  */}
      {/* ------------------------------------------------------------------ */}
      <SidebarHeader className="pb-0">
        <Link
          href={`/dashboard/${projectId}`}
          className="relative flex items-center gap-2.5 px-1 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 rounded-sm"
          aria-label="StudioFlow — project home"
        >
          {/* Ember "SF" tile — amber→ember gradient fill (brand = action, not AI) */}
          <span
            className="grid size-7 shrink-0 place-items-center rounded-lg font-extrabold text-[13px] leading-none select-none"
            style={{
              background:
                "linear-gradient(140deg, var(--brand), var(--brand-2))",
              color: "var(--brand-ink)",
              boxShadow: "0 4px 14px var(--brand-soft)",
              fontFamily: "var(--font-display)",
            }}
            aria-hidden="true"
          >
            SF
          </span>

          {/* Wordmark */}
          <span
            className="text-[15px] font-extrabold tracking-[-0.3px]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--tx)",
            }}
          >
            StudioFlow
          </span>

          {/* Tungsten filament: 1px amber hairline + soft glow underneath wordmark */}
          <span
            aria-hidden
            className="absolute inset-x-1 bottom-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--brand), transparent)",
              boxShadow: "0 0 8px var(--brand)",
              opacity: 0.9,
            }}
          />
        </Link>

        {/* Project switcher — sits below the brandmark filament, above the nav groups */}
        <div className="px-1 pt-3 pb-1">
          <ProjectSwitcher projects={projects} currentProjectId={currentProjectId} />
        </div>
      </SidebarHeader>

      {/* ------------------------------------------------------------------ */}
      {/* Phase-ordered nav groups                                            */}
      {/* ------------------------------------------------------------------ */}
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel
              style={{ color: "var(--tx-3)" }}
              className="text-[9px] font-extrabold tracking-[1px] uppercase"
            >
              {group.label}
            </SidebarGroupLabel>

            <SidebarMenu>
              {group.items.map((item) => {
                if (item.soon) {
                  return <SoonItem key={item.href} item={item} />;
                }

                const href = `/dashboard/${projectId}/${item.href}`;
                const active = pathname.startsWith(href);

                return (
                  <LiveItem
                    key={item.href}
                    item={item}
                    href={href}
                    active={active}
                  />
                );
              })}

              {/* AI Assistant entry appended to the Develop group */}
              {group.appendAI && <AIAssistantItem />}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
