/**
 * PROJECT_EXPORT_MANIFEST — the single source of truth for what a portable
 * project archive contains. Both the exporter (lib/projects/export/export-project.ts)
 * and the future importer iterate THIS list, so adding a feature later means adding
 * ONE entry here — not editing two serializers.
 *
 * manifest.test.ts introspects the live DB for every table reachable from
 * `projects` and fails the build if any is missing here — so a future migration
 * that adds a project-scoped table can't silently produce a lossy archive.
 *
 * Ordering is topological (parents before children): the importer can insert rows
 * and remap foreign keys in a single forward pass.
 */

export type ExportTable = {
  /** public.<table> */
  table: string;
  /**
   * How rows are scoped to a project:
   *   project — has a direct `project_id` column
   *   parent  — no project_id; scoped by FK into a table that appears earlier here
   */
  link:
    | { via: "project"; column: "project_id" }
    | { via: "parent"; parentTable: string; column: string };
  /**
   * Columns that reference another row's id. The importer remaps these through its
   * old→new id map. Unused by export (forward-looking round-trip metadata).
   */
  fkColumns: string[];
  /** Columns holding a Supabase Storage path whose bytes are bundled under media/. */
  mediaColumns?: string[];
};

/** The latest migration id — stamped into every archive so import can gate on skew. */
export const APP_SCHEMA_VERSION = "0022";

/** Storage bucket that backs every mediaColumns path. */
export const MEDIA_BUCKET = "storyboards";

/** Tables intentionally NOT exported (root identity / per-user, re-derived on import). */
export const EXPORT_IGNORE_TABLES = ["projects", "profiles"] as const;

export const PROJECT_EXPORT_MANIFEST: ExportTable[] = [
  // --- Breakdown taxonomy & people -----------------------------------------
  { table: "organizations", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "people", link: { via: "project", column: "project_id" }, fkColumns: ["org_id"] },
  { table: "departments", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "element_categories", link: { via: "project", column: "project_id" }, fkColumns: ["department_id"] },
  { table: "elements", link: { via: "project", column: "project_id" }, fkColumns: ["category_id", "vendor_org_id"] },
  { table: "characters", link: { via: "project", column: "project_id" }, fkColumns: ["cast_person_id"] },

  // --- Locations & sets -----------------------------------------------------
  { table: "locations", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "sets", link: { via: "project", column: "project_id" }, fkColumns: ["location_id"] },

  // --- Script & scenes ------------------------------------------------------
  { table: "revisions", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "scripts", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "script_versions", link: { via: "parent", parentTable: "scripts", column: "script_id" }, fkColumns: ["script_id", "revision_id"] },
  { table: "scenes", link: { via: "project", column: "project_id" }, fkColumns: ["script_id", "set_id"] },
  { table: "scene_sources", link: { via: "parent", parentTable: "scenes", column: "scene_id" }, fkColumns: ["scene_id", "script_version_id"] },
  { table: "scene_revision_changes", link: { via: "parent", parentTable: "scenes", column: "scene_id" }, fkColumns: ["scene_id", "revision_id"] },
  { table: "scene_segments", link: { via: "project", column: "project_id" }, fkColumns: ["scene_id"] },
  { table: "scene_elements", link: { via: "parent", parentTable: "scenes", column: "scene_id" }, fkColumns: ["scene_id", "element_id"] },
  { table: "scene_characters", link: { via: "parent", parentTable: "scenes", column: "scene_id" }, fkColumns: ["scene_id", "character_id"] },

  // --- Async jobs & AI log --------------------------------------------------
  { table: "jobs", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "image_generations", link: { via: "project", column: "project_id" }, fkColumns: ["job_id"] },

  // --- Schedule -------------------------------------------------------------
  { table: "shoot_days", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "strips", link: { via: "project", column: "project_id" }, fkColumns: ["shoot_day_id", "scene_segment_id"] },
  { table: "cast_day_statuses", link: { via: "project", column: "project_id" }, fkColumns: ["person_id"] },

  // --- Budget ---------------------------------------------------------------
  { table: "budgets", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "budget_accounts", link: { via: "parent", parentTable: "budgets", column: "budget_id" }, fkColumns: ["budget_id", "parent_account_id"] },
  { table: "budget_globals", link: { via: "parent", parentTable: "budgets", column: "budget_id" }, fkColumns: ["budget_id"] },
  { table: "fringes", link: { via: "parent", parentTable: "budgets", column: "budget_id" }, fkColumns: ["budget_id"] },
  { table: "budget_lines", link: { via: "parent", parentTable: "budgets", column: "budget_id" }, fkColumns: ["budget_id", "account_id", "rate_global_id"] },
  { table: "budget_line_fringes", link: { via: "parent", parentTable: "budget_lines", column: "line_id" }, fkColumns: ["line_id", "fringe_id", "budget_id"] },
  { table: "cost_entries", link: { via: "parent", parentTable: "budgets", column: "budget_id" }, fkColumns: ["budget_id", "account_id", "line_id"] },

  // --- Crew & call sheets ---------------------------------------------------
  { table: "crew_members", link: { via: "project", column: "project_id" }, fkColumns: ["person_id"] },
  { table: "call_sheets", link: { via: "parent", parentTable: "shoot_days", column: "shoot_day_id" }, fkColumns: ["shoot_day_id"] },
  { table: "crew_dept_calls", link: { via: "parent", parentTable: "shoot_days", column: "shoot_day_id" }, fkColumns: ["shoot_day_id"] },
  { table: "crew_day_calls", link: { via: "parent", parentTable: "shoot_days", column: "shoot_day_id" }, fkColumns: ["shoot_day_id", "crew_member_id"] },
  { table: "cast_day_calls", link: { via: "parent", parentTable: "shoot_days", column: "shoot_day_id" }, fkColumns: ["shoot_day_id", "person_id"] },

  // --- Visual development & storyboard (carry Storage media) ----------------
  { table: "project_visual_settings", link: { via: "project", column: "project_id" }, fkColumns: [] },
  { table: "visual_references", link: { via: "project", column: "project_id" }, fkColumns: ["character_id", "location_id"], mediaColumns: ["image_path"] },
  { table: "shots", link: { via: "project", column: "project_id" }, fkColumns: ["scene_id"] },
  { table: "shot_frames", link: { via: "project", column: "project_id" }, fkColumns: ["shot_id"], mediaColumns: ["image_path"] },
];
