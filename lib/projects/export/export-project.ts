/**
 * Walk PROJECT_EXPORT_MANIFEST and assemble a complete, self-contained snapshot
 * of one project's rows + the Storage paths of its media. Pure data assembly —
 * zipping lives in archive.ts; the route stamps `exportedAt` and serves the file.
 *
 * RLS scopes every read to the caller's session, so a user can only export a
 * project they own. via:parent tables are resolved against ids collected from
 * tables that appear earlier in the (topologically ordered) manifest.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  PROJECT_EXPORT_MANIFEST,
  APP_SCHEMA_VERSION,
  type ExportTable,
} from "@/lib/projects/export/manifest";

type DbClient = SupabaseClient<Database>;

/** Archive format version — bump when the envelope shape changes (not the schema). */
export const ARCHIVE_FORMAT = 1;

export type ProjectArchive = {
  manifest: {
    format: number;
    schemaVersion: string;
    exportedAt: string;
    projectId: string;
    /** Table → ordered FK columns, so the importer can remap without re-deriving. */
    fkColumns: Record<string, string[]>;
  };
  /** The project row itself (owner_id/timestamps reassigned on import). */
  project: Record<string, unknown>;
  /** table name → rows, in manifest order. */
  tables: Record<string, Record<string, unknown>[]>;
  /** Storage paths (bucket-relative) referenced by mediaColumns across all rows. */
  media: string[];
};

const IN_CHUNK = 500;

async function fetchRows(
  client: DbClient,
  desc: ExportTable,
  projectId: string,
  idsByTable: Map<string, string[]>,
): Promise<Record<string, unknown>[]> {
  const from = client.from(desc.table as never);

  if (desc.link.via === "project") {
    const { data, error } = await from.select("*").eq("project_id", projectId);
    if (error) throw new Error(`export ${desc.table}: ${error.message}`, { cause: error });
    return (data ?? []) as Record<string, unknown>[];
  }

  // via:parent — gather rows whose linking column is in the parent's collected ids.
  const parentIds = idsByTable.get(desc.link.parentTable) ?? [];
  if (parentIds.length === 0) return [];

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < parentIds.length; i += IN_CHUNK) {
    const chunk = parentIds.slice(i, i + IN_CHUNK);
    const { data, error } = await client
      .from(desc.table as never)
      .select("*")
      .in(desc.link.column, chunk);
    if (error) throw new Error(`export ${desc.table}: ${error.message}`, { cause: error });
    rows.push(...((data ?? []) as Record<string, unknown>[]));
  }
  return rows;
}

export async function exportProject(
  client: DbClient,
  projectId: string,
  exportedAt: string,
): Promise<ProjectArchive> {
  const { data: projectRow, error: projectErr } = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (projectErr || !projectRow) {
    throw new Error(`export: project ${projectId} not found or not accessible`, {
      cause: projectErr ?? undefined,
    });
  }

  const tables: Record<string, Record<string, unknown>[]> = {};
  const idsByTable = new Map<string, string[]>();
  const media = new Set<string>();
  const fkColumns: Record<string, string[]> = {};

  for (const desc of PROJECT_EXPORT_MANIFEST) {
    const rows = await fetchRows(client, desc, projectId, idsByTable);
    tables[desc.table] = rows;
    idsByTable.set(
      desc.table,
      rows.map((r) => String(r.id)).filter((id) => id !== "undefined"),
    );
    fkColumns[desc.table] = desc.fkColumns;

    if (desc.mediaColumns) {
      for (const row of rows) {
        for (const col of desc.mediaColumns) {
          const path = row[col];
          if (typeof path === "string" && path.length > 0) media.add(path);
        }
      }
    }
  }

  return {
    manifest: {
      format: ARCHIVE_FORMAT,
      schemaVersion: APP_SCHEMA_VERSION,
      exportedAt,
      projectId,
      fkColumns,
    },
    project: projectRow as Record<string, unknown>,
    tables,
    media: [...media],
  };
}
