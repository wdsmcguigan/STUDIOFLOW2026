/**
 * Pack a ProjectArchive (+ its media bytes) into a single .zip via fflate.
 *
 * Layout:
 *   studioflow-project.json   the full data envelope (manifest + project + tables)
 *   media/<storage path>      one file per bundled Storage object
 *
 * fflate's zipSync is synchronous and dependency-free — fine for the moderate
 * archive sizes here. (Streaming is a future optimization for very large media.)
 */

import { zipSync, strToU8, type Zippable } from "fflate";
import type { ProjectArchive } from "@/lib/projects/export/export-project";

export const ARCHIVE_JSON_NAME = "studioflow-project.json";
export const ARCHIVE_MEDIA_DIR = "media";

export type MediaFile = { path: string; bytes: Uint8Array };

// Fixed mtime (1980-01-01 UTC, in ms) so archives are byte-deterministic and we
// never touch Date.now(). zip timestamps are only valid for 1980–2099.
const ZIP_MTIME_MS = 315_532_800_000;

export function buildArchive(archive: ProjectArchive, mediaFiles: MediaFile[]): Uint8Array {
  const entries: Zippable = {
    [ARCHIVE_JSON_NAME]: strToU8(JSON.stringify(archive, null, 2)),
  };

  for (const file of mediaFiles) {
    // Mirror the original bucket-relative path under media/ so import can map it back.
    entries[`${ARCHIVE_MEDIA_DIR}/${file.path}`] = file.bytes;
  }

  // level 6 = balanced; mtime fixed to keep output deterministic (no Date.now()).
  return zipSync(entries, { level: 6, mtime: ZIP_MTIME_MS });
}

/** Filesystem-safe archive filename, e.g. "my-film-2026-06-08.zip". */
export function archiveFilename(title: string, isoDate: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project";
  return `${slug}-${isoDate.slice(0, 10)}.zip`;
}
