/**
 * GET /dashboard/[projectId]/storyboard/[sceneId]/pdf
 *
 * Streams the scene storyboard as a PDF attachment.
 * Uses renderStoryboardPdf from the .tsx document file so JSX stays out of .ts.
 * Auth is enforced via RLS — createClient() uses the user's session cookies.
 *
 * Image strategy for react-pdf: getSceneBoard returns signed Supabase Storage
 * URLs (https). react-pdf fetches https images server-side during renderToBuffer.
 * Signed URLs from Supabase are plain https URLs within their TTL window, which
 * react-pdf can fetch directly. If an image fails (e.g. expired URL) the panel
 * will fall through to the placeholder path (selectedUrl: null) in the document.
 */

import { createClient } from "@/lib/supabase/server";
import { getSceneBoard } from "@/lib/storyboard/data";
import { renderStoryboardPdf } from "@/lib/storyboard/pdf/storyboard-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; sceneId: string }> },
) {
  const { sceneId } = await params;

  // createClient returns SupabaseClient<Database>; cast to satisfy DbClient
  // (the same `supabase as never` pattern used throughout this app's pages/actions)
  const supabase = await createClient();
  const board = await getSceneBoard(supabase as never, sceneId);

  // Use sceneId as the label fallback; the UI can build a more descriptive URL
  // once it has the scene number (e.g. /pdf?label=Scene+14A).
  const url = new URL(_request.url);
  const sceneLabel = url.searchParams.get("label") ?? `Scene ${sceneId.slice(0, 8)}`;

  const buf = await renderStoryboardPdf(board, sceneLabel);

  const filename = `storyboard-${sceneId}.pdf`;

  // Use Uint8Array so the Response BodyInit type is satisfied (Buffer extends Uint8Array)
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "content-length": String(buf.length),
    },
  });
}
