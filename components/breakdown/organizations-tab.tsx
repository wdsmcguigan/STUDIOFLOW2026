"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/lib/breakdown/schema";

const ORG_TYPE_LABELS: Record<string, string> = {
  production_company: "Production Co.",
  agency: "Agency",
  vendor: "Vendor",
  payroll: "Payroll",
  insurer: "Insurer",
  other: "Other",
};

interface OrganizationsTabProps {
  projectId: string;
  organizations: Organization[];
  createOrganizationAction: (formData: FormData) => Promise<void>;
}

/** Organizations list with create form. */
export function OrganizationsTab({
  projectId,
  organizations,
  createOrganizationAction,
}: OrganizationsTabProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await createOrganizationAction(formData);
    formRef.current?.reset();
  }

  return (
    <section aria-label="Organizations" className="space-y-6">
      {/* Create form */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--tx)]">
          New organization
        </h3>
        <form ref={formRef} action={handleSubmit} className="grid gap-3">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-1">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              name="name"
              placeholder="e.g. Apex Stunts LLC"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-type">Type</Label>
            <select
              id="org-type"
              name="type"
              required
              defaultValue="vendor"
              className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {Object.entries(ORG_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="org-notes">Notes (optional)</Label>
            <Input
              id="org-notes"
              name="notes"
              placeholder="Contact info, notes…"
              maxLength={2000}
            />
          </div>

          <Button type="submit" variant="ember" size="sm" className="w-fit">
            Add organization
          </Button>
        </form>
      </div>

      {/* Organization list */}
      {organizations.length > 0 ? (
        <ul className="space-y-2" aria-label="Organizations list">
          {organizations.map((o) => (
            <li
              key={o.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--s2)] px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--tx)]">{o.name}</p>
                {o.notes ? (
                  <p className="text-[11px] text-[var(--tx-2)] mt-0.5 truncate">
                    {o.notes}
                  </p>
                ) : null}
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {ORG_TYPE_LABELS[o.type] ?? o.type}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--tx-3)]">
          No organizations yet. Add one above.
        </p>
      )}
    </section>
  );
}
