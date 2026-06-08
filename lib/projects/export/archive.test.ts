import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  buildArchive,
  archiveFilename,
  ARCHIVE_JSON_NAME,
  ARCHIVE_MEDIA_DIR,
  type MediaFile,
} from "@/lib/projects/export/archive";
import type { ProjectArchive } from "@/lib/projects/export/export-project";

function fixture(): ProjectArchive {
  return {
    manifest: {
      format: 1,
      schemaVersion: "0022",
      exportedAt: "2026-06-08T00:00:00.000Z",
      projectId: "p1",
      fkColumns: { scenes: ["script_id", "set_id"] },
    },
    project: { id: "p1", title: "My Film", status: "post" },
    tables: { scenes: [{ id: "s1", project_id: "p1", scene_number: "1" }] },
    media: ["projects/p1/shots/x/0.webp"],
  };
}

describe("buildArchive", () => {
  it("writes the data envelope + media files into the zip", () => {
    const media: MediaFile[] = [
      { path: "projects/p1/shots/x/0.webp", bytes: new Uint8Array([1, 2, 3, 4]) },
    ];
    const zip = buildArchive(fixture(), media);
    const files = unzipSync(zip);

    expect(Object.keys(files)).toContain(ARCHIVE_JSON_NAME);
    expect(Object.keys(files)).toContain(`${ARCHIVE_MEDIA_DIR}/projects/p1/shots/x/0.webp`);

    const parsed = JSON.parse(strFromU8(files[ARCHIVE_JSON_NAME]));
    expect(parsed.manifest.schemaVersion).toBe("0022");
    expect(parsed.manifest.format).toBe(1);
    expect(parsed.tables.scenes).toHaveLength(1);
    // FK columns preserved so identity is remappable on import (not keyed to display values).
    expect(parsed.manifest.fkColumns.scenes).toContain("script_id");
    expect([...files[`${ARCHIVE_MEDIA_DIR}/projects/p1/shots/x/0.webp`]]).toEqual([1, 2, 3, 4]);
  });

  it("produces a valid zip with no media", () => {
    const zip = buildArchive(fixture(), []);
    const files = unzipSync(zip);
    expect(Object.keys(files)).toEqual([ARCHIVE_JSON_NAME]);
  });
});

describe("archiveFilename", () => {
  it("slugifies the title and appends the date", () => {
    expect(archiveFilename("My Film: The Sequel!", "2026-06-08T12:00:00.000Z")).toBe(
      "my-film-the-sequel-2026-06-08.zip",
    );
  });

  it("falls back to 'project' for an empty/symbol title", () => {
    expect(archiveFilename("!!!", "2026-06-08T00:00:00.000Z")).toBe("project-2026-06-08.zip");
  });
});
