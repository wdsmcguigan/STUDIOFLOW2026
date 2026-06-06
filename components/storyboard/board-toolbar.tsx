"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Images } from "lucide-react";

import type { GenerationTotals } from "@/lib/storyboard/schema";
import { estimateCost } from "@/lib/storyboard/cost";
import { Button } from "@/components/ui/button";
import { AIChip } from "@/components/ui/ai-surface";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  boardSceneAction,
  renderSceneAction,
} from "@/app/dashboard/[projectId]/storyboard/actions";

interface BoardToolbarProps {
  projectId: string;
  sceneId: string;
  sceneLabel: string;
  hasShots: boolean;
  /** Number of shots lacking a selected frame (i.e. panels needing a render). */
  pendingPanels: number;
  /** The configured render model id, for the cost estimate. */
  renderModelId: string;
  totals: GenerationTotals;
}

/** Format a USD amount for the cost chip / dialog (always 2dp). */
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * Board toolbar — the scene-level actions:
 *  - "Board scene" → synchronous decompose (shots appear on revalidate).
 *  - "Render panels" → opens a confirm-on-batch dialog ("N panels, ~$X")
 *    before enqueuing the async render job.
 *  - A cost chip (lifetime image count + est spend).
 *  - "Export PDF" link to the scene's PDF route.
 */
export function BoardToolbar({
  projectId,
  sceneId,
  sceneLabel,
  hasShots,
  pendingPanels,
  renderModelId,
  totals,
}: BoardToolbarProps) {
  const [open, setOpen] = useState(false);
  const estimated = estimateCost(renderModelId, pendingPanels);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3">
      {/* Board scene — synchronous decompose */}
      <form action={boardSceneAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sceneId" value={sceneId} />
        <Button type="submit" variant={hasShots ? "secondary" : "ember"} size="sm">
          {hasShots ? "Re-board scene" : "Board scene"}
        </Button>
      </form>

      {/* Render panels — confirm-on-batch */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="ember" size="sm" disabled={!hasShots || pendingPanels === 0} />
          }
        >
          <Images className="size-3.5" aria-hidden="true" />
          Render panels{pendingPanels > 0 ? ` (${pendingPanels})` : ""}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Render storyboard panels</DialogTitle>
            <DialogDescription>
              This will generate{" "}
              <span className="font-medium text-[var(--tx)]">
                {pendingPanels} panel{pendingPanels === 1 ? "" : "s"}
              </span>{" "}
              for {sceneLabel} at an estimated cost of{" "}
              <span className="font-medium text-[var(--tx)]">
                ~{fmtUsd(estimated)}
              </span>
              . Panels render in the background; you can keep working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Cancel
            </DialogClose>
            <form
              action={renderSceneAction}
              onSubmit={() => setOpen(false)}
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="sceneId" value={sceneId} />
              <Button type="submit" variant="ember" size="sm">
                Render {pendingPanels} panel{pendingPanels === 1 ? "" : "s"}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export PDF */}
      <Link
        href={`/dashboard/${projectId}/storyboard/${sceneId}/pdf?label=${encodeURIComponent(sceneLabel)}`}
        className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-[var(--tx-2)] ring-1 ring-[var(--line-2)] transition-colors hover:bg-[var(--s3)] hover:text-[var(--tx)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Download className="size-3.5" aria-hidden="true" />
        Export PDF
      </Link>

      {/* Cost chip — lifetime generation totals (AI accent) */}
      <AIChip className="ml-auto">
        {totals.imageCount} image{totals.imageCount === 1 ? "" : "s"} ·{" "}
        {fmtUsd(totals.estCost)}
      </AIChip>
    </div>
  );
}
