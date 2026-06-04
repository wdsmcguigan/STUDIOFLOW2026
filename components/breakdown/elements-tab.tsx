"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ElementCategory, Element } from "@/lib/breakdown/schema";

interface ElementsTabProps {
  projectId: string;
  categories: ElementCategory[];
  elements: Element[];
  createElementAction: (formData: FormData) => Promise<void>;
}

/** Elements grouped by category, with an inline create form. */
export function ElementsTab({
  projectId,
  categories,
  elements,
  createElementAction,
}: ElementsTabProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Group elements by category_id
  const byCategory = new Map<string, Element[]>();
  for (const el of elements) {
    const existing = byCategory.get(el.category_id) ?? [];
    byCategory.set(el.category_id, [...existing, el]);
  }

  async function handleSubmit(formData: FormData) {
    await createElementAction(formData);
    formRef.current?.reset();
  }

  return (
    <section aria-label="Elements catalog" className="space-y-6">
      {/* Create form */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--tx)]">
          New element
        </h3>
        <form ref={formRef} action={handleSubmit} className="grid gap-3">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-1">
            <Label htmlFor="el-category">Category</Label>
            <select
              id="el-category"
              name="categoryId"
              required
              className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <option value="">Pick a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="el-name">Name</Label>
            <Input
              id="el-name"
              name="name"
              placeholder="e.g. Chrome revolver"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="el-desc">Description (optional)</Label>
            <Input
              id="el-desc"
              name="description"
              placeholder="Notes or details"
              maxLength={2000}
            />
          </div>

          <Button type="submit" variant="ember" size="sm" className="w-fit">
            Add element
          </Button>
        </form>
      </div>

      {/* Element list grouped by category */}
      {categories.length === 0 ? (
        <p className="text-sm text-[var(--tx-3)]">
          No categories yet. The taxonomy seeds automatically on page load.
        </p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catElements = byCategory.get(cat.id) ?? [];
            if (catElements.length === 0) return null;
            return (
              <div key={cat.id}>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
                  {cat.name}
                </h4>
                <ul
                  className="space-y-[5px]"
                  aria-label={`${cat.name} elements`}
                >
                  {catElements.map((el) => (
                    <li
                      key={el.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--s2)] px-3 py-2 text-sm text-[var(--tx)]"
                    >
                      <span className="flex-1 truncate font-medium">
                        {el.name}
                      </span>
                      {el.description ? (
                        <span className="hidden min-w-0 flex-1 truncate text-[11px] text-[var(--tx-3)] sm:block">
                          {el.description}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {elements.length === 0 ? (
            <p className="text-sm text-[var(--tx-3)]">No elements yet. Add one above.</p>
          ) : null}
        </div>
      )}

      {/* Empty state: categories seeded but no elements */}
      {categories.length > 0 && elements.length === 0 ? (
        <p className="text-sm text-[var(--tx-3)]">No elements yet. Add one above.</p>
      ) : null}
    </section>
  );
}

/** Compact element badge used in scene detail breakdown section. */
export function ElementBadge({
  name,
  categoryName,
}: {
  name: string;
  categoryName?: string;
}) {
  return (
    <Badge variant="outline" className="gap-1 text-[11px]">
      {categoryName ? (
        <span className="text-[var(--tx-3)]">{categoryName}</span>
      ) : null}
      {name}
    </Badge>
  );
}
