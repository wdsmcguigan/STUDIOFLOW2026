import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/**
 * SERVER-ONLY service-role client. Bypasses RLS — use ONLY in trusted server/background
 * contexts (e.g. WDK workflow steps) where ownership was already proven at enqueue.
 * NEVER import this into a client component.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
