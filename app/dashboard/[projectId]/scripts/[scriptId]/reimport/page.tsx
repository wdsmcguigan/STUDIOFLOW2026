import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeStagedDiff } from "@/lib/scripts/data";
import { DiffReview } from "@/components/scripts/diff-review";
import { confirmReimportAction } from "@/app/dashboard/[projectId]/import/actions";

export default async function ReimportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; scriptId: string }>;
  searchParams: Promise<{ versionId?: string }>;
}) {
  const { projectId, scriptId } = await params;
  const { versionId } = await searchParams;
  if (!versionId) notFound();

  const supabase = await createClient();
  const { diff, inAppByScene } = await computeStagedDiff(supabase as unknown as never, {
    projectId,
    scriptId,
    scriptVersionId: versionId,
  });
  const confirm = confirmReimportAction.bind(null, { projectId, scriptId });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Review re-import</h1>
      <p className="text-sm text-muted-foreground">
        Nothing has been applied yet. Review the changes, then confirm to apply
        (matched scenes keep their id; removed scenes become OMITTED).
      </p>
      <DiffReview
        scriptVersionId={versionId}
        diff={diff}
        inAppByScene={inAppByScene}
        confirmAction={confirm}
      />
    </main>
  );
}
