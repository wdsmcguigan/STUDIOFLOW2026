/**
 * Supabase Storage helpers for storyboard images.
 *
 * Uses the service-role client (bypasses RLS) because these functions are
 * called from trusted server-only background contexts (e.g. WDK workflow steps)
 * after ownership has already been validated at enqueue time.
 *
 * Verified Supabase storage-js API shapes (from @supabase/storage-js dist types):
 *
 *   upload(path, body, opts): Promise<{ data: { id, path, fullPath }, error: null }
 *                                    | { data: null, error: StorageError }>
 *     - FileBody includes ArrayBufferView (covers Uint8Array) ✓
 *     - FileOptions has `contentType` and `upsert` fields ✓
 *
 *   createSignedUrl(path, expiresIn): Promise<{ data: { signedUrl: string }, error: null }
 *                                            | { data: null, error: StorageError }>
 *     - signedUrl is camelCase (not snake_case) ✓
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "storyboards";

/**
 * Upload a storyboard frame image to the `storyboards` bucket.
 *
 * @param bytes   Raw image bytes (e.g. from GeneratedFile.uint8Array).
 * @param opts.path        Storage path within the bucket (e.g. `projects/<id>/shots/<id>/0.webp`).
 * @param opts.contentType IANA media type (e.g. `image/webp`, `image/png`).
 * @returns The storage path on success; throws on error.
 */
export async function uploadStoryboardImage(
  bytes: Uint8Array,
  opts: { path: string; contentType: string }
): Promise<string> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(opts.path, bytes, { contentType: opts.contentType, upsert: true });

  if (error) throw new Error(error.message, { cause: error });
  return opts.path;
}

/**
 * Generate a short-lived signed URL for a storyboard image path.
 *
 * @param path      Storage path within the `storyboards` bucket.
 * @param expiresIn Seconds until the URL expires (default: 3600 = 1 hour).
 * @returns Signed URL string; throws on error.
 */
export async function signStoryboardUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(error.message, { cause: error });
  return data.signedUrl;
}
