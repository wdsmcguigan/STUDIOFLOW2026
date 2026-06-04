import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/projects/schema";

/**
 * Map a project status string to a Badge variant + display label.
 * Status is paired with a text label — never encoded in color alone (a11y).
 */
function statusBadge(status: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  switch (status) {
    case "development":
      return { label: "Development", variant: "secondary" };
    case "pre-production":
      return { label: "Pre-production", variant: "outline" };
    case "production":
      return { label: "Production", variant: "default" };
    case "post":
      return { label: "Post", variant: "secondary" };
    case "archived":
      return { label: "Archived", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <p style={{ color: "var(--tx-2)" }} className="text-sm">
        No projects yet. Create your first above.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const { label, variant } = statusBadge(p.status);
        return (
          <li key={p.id} className="flex flex-col gap-1.5">
            {/*
              Link wraps only the card — "Import script" is a sibling element.
              No nested anchors. The card is the project workspace target.
            */}
            <Link
              href={`/dashboard/${p.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1"
              aria-label={`Open ${p.title}`}
            >
              <Card
                className="p-4 transition-colors"
                style={{
                  background: "var(--s2)",
                  borderColor: "var(--line-2)",
                }}
                // hover handled via Tailwind data-attribute; fall back to inline for token
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="text-sm font-bold leading-snug tracking-[-0.2px]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
                  >
                    {p.title}
                  </h3>
                  <Badge variant={variant} className="shrink-0">
                    {label}
                  </Badge>
                </div>
              </Card>
            </Link>

            {/* Sibling link — not nested inside the project card anchor */}
            <a
              href={`/dashboard/${p.id}/import`}
              className="ml-1 text-xs underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              style={{ color: "var(--brand-on)" }}
            >
              Import script
            </a>
          </li>
        );
      })}
    </ul>
  );
}
