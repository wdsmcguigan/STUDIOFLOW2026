"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TAB_IDS = ["elements", "characters", "people", "organizations"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  elements: "Elements",
  characters: "Characters",
  people: "People",
  organizations: "Organizations",
};

interface BreakdownTabsProps {
  elements: React.ReactNode;
  characters: React.ReactNode;
  people: React.ReactNode;
  organizations: React.ReactNode;
}

/**
 * Client-only tab switcher for the Breakdown page.
 * Uses local state — no URL state needed for v1 (fast-follow: searchParams).
 */
export function BreakdownTabs({
  elements,
  characters,
  people,
  organizations,
}: BreakdownTabsProps) {
  const [active, setActive] = useState<TabId>("elements");

  const panels: Record<TabId, React.ReactNode> = {
    elements,
    characters,
    people,
    organizations,
  };

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <nav
        role="tablist"
        aria-label="Breakdown sections"
        className="flex gap-1 border-b border-[var(--line)] pb-0"
      >
        {TAB_IDS.map((id) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            onClick={() => setActive(id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors focus-visible:rounded-t focus-visible:outline-2 focus-visible:outline-[var(--ring)]",
              active === id
                ? "border-b-2 border-[var(--brand)] text-[var(--tx)]"
                : "text-[var(--tx-3)] hover:text-[var(--tx-2)]",
            )}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </nav>

      {/* Active panel */}
      {TAB_IDS.map((id) => (
        <div
          key={id}
          role="tabpanel"
          id={`panel-${id}`}
          aria-labelledby={`tab-${id}`}
          hidden={active !== id}
        >
          {panels[id]}
        </div>
      ))}
    </div>
  );
}
