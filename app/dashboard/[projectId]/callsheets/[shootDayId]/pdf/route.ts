/**
 * GET /dashboard/[projectId]/callsheets/[shootDayId]/pdf
 *
 * Streams the call sheet as a PDF attachment.
 * Uses renderCallSheetPdf from the .tsx document file so JSX stays out of .ts.
 * Auth is enforced via RLS — createClient() uses the user's session cookies.
 */

import { createClient } from "@/lib/supabase/server";
import { getCallSheet } from "@/lib/callsheet/data";
import { renderCallSheetPdf } from "@/lib/callsheet/pdf/call-sheet-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; shootDayId: string }> },
) {
  const { shootDayId } = await params;

  // createClient returns SupabaseClient<Database>; cast to satisfy DbClient
  // (the same `supabase as never` pattern used throughout this app's pages/actions)
  const supabase = await createClient();
  const callSheet = await getCallSheet(supabase as never, shootDayId);

  const buf = await renderCallSheetPdf(callSheet);

  const filename = `call-sheet-day-${callSheet.header.dayNumber}-rev${callSheet.header.revision}.pdf`;

  // Use Uint8Array so the Response BodyInit type is satisfied (Buffer extends Uint8Array)
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "content-length": String(buf.length),
    },
  });
}
