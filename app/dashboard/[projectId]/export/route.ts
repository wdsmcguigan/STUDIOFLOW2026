/**
 * GET /dashboard/[projectId]/export
 *
 * Streams a portable .zip archive of the whole project (studioflow-project.json +
 * media/). Auth is enforced by RLS — createClient() uses the user's session, and
 * the storyboards bucket is owner-scoped, so no service role is needed.
 */

import { createClient } from "@/lib/supabase/server";
import { exportProject } from "@/lib/projects/export/export-project";
import { buildArchive, archiveFilename, type MediaFile } from "@/lib/projects/export/archive";
import { MEDIA_BUCKET } from "@/lib/projects/export/manifest";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const supabase = await createClient();

  const exportedAt = new Date().toISOString();
  const archive = await exportProject(supabase as never, projectId, exportedAt);

  // Best-effort media bundling: a missing/expired object is skipped, not fatal —
  // the data envelope still names the path, so import can flag the gap.
  const mediaFiles: MediaFile[] = [];
  for (const path of archive.media) {
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(path);
    if (error || !data) {
      console.warn(`[project export] skipped media ${path}: ${error?.message ?? "no data"}`);
      continue;
    }
    mediaFiles.push({ path, bytes: new Uint8Array(await data.arrayBuffer()) });
  }

  const zip = buildArchive(archive, mediaFiles);
  const title = String(archive.project.title ?? "project");
  const filename = archiveFilename(title, exportedAt);

  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(zip.length),
    },
  });
}
