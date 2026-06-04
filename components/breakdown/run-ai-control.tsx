"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startBreakdownAction } from "@/app/dashboard/[projectId]/breakdown/actions";
import type { Script } from "@/lib/scripts/schema";

interface RunAiControlProps {
  projectId: string;
  scripts: Script[];
}

/**
 * Client component — lets the user pick a script and submit a breakdown job.
 * Uses the sage→amethyst AI-surface design token.
 */
export function RunAiControl({ projectId, scripts }: RunAiControlProps) {
  const [scriptId, setScriptId] = useState<string>(scripts[0]?.id ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await startBreakdownAction(formData);
    } finally {
      setPending(false);
    }
  }

  if (scripts.length === 0) {
    return (
      <p className="text-[12px] text-[var(--tx-3)]">
        No scripts in this project. Import a script first.
      </p>
    );
  }

  return (
    <div className="ai-surface rounded-xl p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--ai-ink)]">
        Run AI breakdown
      </h2>
      <form action={handleSubmit} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="projectId" value={projectId} />

        {scripts.length > 1 ? (
          <div className="space-y-1">
            <label
              htmlFor="run-ai-script"
              className="text-[11px] font-medium text-[var(--tx-3)]"
            >
              Script
            </label>
            <select
              id="run-ai-script"
              name="scriptId"
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
              className="h-8 rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Select script for AI breakdown"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <input type="hidden" name="scriptId" value={scriptId} />
            <p className="text-[12px] text-[var(--tx-3)]">
              Script:{" "}
              <span className="font-medium text-[var(--tx)]">
                {scripts[0].title}
              </span>
            </p>
          </>
        )}

        <Button
          type="submit"
          variant="ember"
          size="sm"
          disabled={pending || !scriptId}
          aria-busy={pending}
        >
          {pending ? "Queuing…" : "Run AI breakdown"}
        </Button>
      </form>
    </div>
  );
}
