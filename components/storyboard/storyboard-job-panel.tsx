import { Badge } from "@/components/ui/badge";
import { cancelStoryboardJobAction } from "@/app/dashboard/[projectId]/storyboard/actions";
import type { Job } from "@/lib/breakdown/schema";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "secondary",
  running: "default",
  succeeded: "default",
  failed: "destructive",
  cancelled: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

const TYPE_LABEL: Record<string, string> = {
  storyboard_render: "Rendering panels",
  storyboard_reference: "Generating reference",
};

interface StoryboardJobPanelProps {
  projectId: string;
  jobs: Job[];
}

/**
 * Storyboard job panel — render & reference generation progress + cancel.
 *
 * Mirrors the breakdown JobQueuePanel (same shared Job shape + createJob/getJob
 * pipeline) but wires cancelStoryboardJobAction (which adds best-effort WDK
 * cancel) and storyboard-specific type labels + units ("panels" not "scenes").
 */
export function StoryboardJobPanel({ projectId, jobs }: StoryboardJobPanelProps) {
  if (jobs.length === 0) {
    return <p className="text-[12px] text-[var(--tx-3)]">No jobs yet.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Storyboard generation jobs">
      {jobs.map((j) => {
        const isActive = j.status === "queued" || j.status === "running";
        const progressPct =
          j.total && j.total > 0
            ? Math.round(((j.completed ?? 0) / j.total) * 100)
            : j.progress ?? 0;

        return (
          <li
            key={j.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={STATUS_VARIANT[j.status] ?? "outline"}
                    className="text-[10px]"
                  >
                    {STATUS_LABEL[j.status] ?? j.status}
                  </Badge>
                  <span className="font-data text-[11px] text-[var(--tx-3)]">
                    {TYPE_LABEL[j.type] ?? j.type}
                  </span>
                </div>

                {(j.status === "running" || j.status === "succeeded") && (
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Job progress: ${progressPct}%`}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {j.total && j.total > 0 ? (
                  <p className="font-data text-[10px] text-[var(--tx-3)]">
                    {j.completed ?? 0} / {j.total} panels
                  </p>
                ) : null}

                {j.error ? (
                  <p className="text-[11px] text-[var(--error)]" role="alert">
                    {j.error}
                  </p>
                ) : null}

                <p className="font-data text-[10px] text-[var(--tx-3)]">
                  {new Date(j.created_at).toLocaleString()}
                </p>
              </div>

              {isActive && (
                <form action={cancelStoryboardJobAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="jobId" value={j.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-0.5 text-[11px] text-[var(--tx-3)] ring-1 ring-[var(--line-2)] transition-colors hover:bg-[var(--s3)] hover:text-[var(--tx)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Cancel job"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
