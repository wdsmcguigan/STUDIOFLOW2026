"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Person, Organization } from "@/lib/breakdown/schema";

interface PeopleTabProps {
  projectId: string;
  people: Person[];
  organizations: Organization[];
  createPersonAction: (formData: FormData) => Promise<void>;
}

/** People (crew / cast candidates) list with create form. */
export function PeopleTab({
  projectId,
  people,
  organizations,
  createPersonAction,
}: PeopleTabProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await createPersonAction(formData);
    formRef.current?.reset();
  }

  return (
    <section aria-label="People" className="space-y-6">
      {/* Create form */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--tx)]">
          New person
        </h3>
        <form ref={formRef} action={handleSubmit} className="grid gap-3">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-1">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              name="name"
              placeholder="Full name"
              required
              maxLength={200}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="person-email">Email (optional)</Label>
              <Input
                id="person-email"
                name="contactEmail"
                type="email"
                placeholder="name@agency.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-phone">Phone (optional)</Label>
              <Input
                id="person-phone"
                name="contactPhone"
                type="tel"
                placeholder="(555) 000-0000"
                maxLength={50}
              />
            </div>
          </div>

          {organizations.length > 0 ? (
            <div className="space-y-1">
              <Label htmlFor="person-org">Organization (optional)</Label>
              <select
                id="person-org"
                name="orgId"
                className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">None</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Button type="submit" variant="ember" size="sm" className="w-fit">
            Add person
          </Button>
        </form>
      </div>

      {/* People list */}
      {people.length > 0 ? (
        <ul className="space-y-2" aria-label="People list">
          {people.map((p) => {
            const org = organizations.find((o) => o.id === p.org_id);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--s2)] px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--tx)]">
                    {p.name}
                  </p>
                  {org ? (
                    <p className="text-[10px] text-[var(--tx-3)]">{org.name}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {p.contact_email ? (
                    <a
                      href={`mailto:${p.contact_email}`}
                      className="text-[11px] text-[var(--brand)] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                    >
                      {p.contact_email}
                    </a>
                  ) : null}
                  {p.contact_phone ? (
                    <span className="font-data text-[10px] text-[var(--tx-3)]">
                      {p.contact_phone}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[var(--tx-3)]">
          No people yet. Add one above.
        </p>
      )}
    </section>
  );
}
