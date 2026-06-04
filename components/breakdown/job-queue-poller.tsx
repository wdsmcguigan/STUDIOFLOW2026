"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface JobQueuePollerProps {
  /** Whether any job is currently active (queued or running). */
  hasActiveJobs: boolean;
  /** Polling interval in ms while active jobs exist. */
  intervalMs?: number;
}

/**
 * Thin client component: calls router.refresh() on an interval while any
 * job is queued or running, then stops. Clears the interval on unmount.
 * No UI — purely a side-effect component.
 */
export function JobQueuePoller({
  hasActiveJobs,
  intervalMs = 2500,
}: JobQueuePollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasActiveJobs) return;
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [hasActiveJobs, intervalMs, router]);

  return null;
}
