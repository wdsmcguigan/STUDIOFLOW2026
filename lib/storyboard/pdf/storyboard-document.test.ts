/**
 * TDD render tests for the storyboard PDF document.
 *
 * Tests that renderStoryboardPdf produces a real PDF buffer (%PDF header)
 * for a fixture SceneBoard with 2 shots — one with a data-URI image, one with
 * selectedUrl: null (exercises the empty-panel path).
 *
 * Image strategy: data:image/png;base64,... URIs are passed as selectedUrl
 * so react-pdf embeds them directly — NO network calls, NO signed-URL fetch.
 *
 * Mirrors lib/callsheet/pdf/call-sheet-document.test.tsx.
 */

import { describe, it, expect } from "vitest";
import { renderStoryboardPdf } from "./storyboard-document";
import type { SceneBoard } from "@/lib/storyboard/schema";

// ---------------------------------------------------------------------------
// Minimal valid PNG — 1×1 white RGB pixel, verified decompressible.
// Generated with node zlib.deflateSync so the IDAT passes the data check.
// react-pdf embeds data URIs directly; no network required in tests.
// ---------------------------------------------------------------------------
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC";
const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_B64}`;

// ---------------------------------------------------------------------------
// Fixture — 2 shots:
//   shot A — has a selectedUrl (data URI, embedded, no network)
//   shot B — selectedUrl: null (exercises the "no panel yet" placeholder path)
// ---------------------------------------------------------------------------
const fixture: SceneBoard = {
  sceneId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  shots: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      scene_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ordinal: 0,
      size: "MCU",
      angle: "eye",
      movement: "static",
      lens: "50mm",
      action: "Detective picks up the folder, pauses — looks to camera.",
      shot_number: "1A",
      status: "suggested",
      provenance: "ai",
      frames: [
        {
          id: "f1111111-1111-1111-1111-111111111111",
          signedUrl: TINY_PNG_DATA_URI,
          isSelected: true,
          status: "selected",
          ordinal: 0,
        },
      ],
      selectedUrl: TINY_PNG_DATA_URI,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      scene_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ordinal: 1,
      size: "WS",
      angle: "high",
      movement: "pan",
      lens: null,
      action: "Wide reveal: the entire evidence wall comes into frame.",
      shot_number: null,
      status: "suggested",
      provenance: "ai",
      frames: [],
      selectedUrl: null, // exercises the empty-panel placeholder
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderStoryboardPdf", () => {
  it("returns a Buffer whose first bytes are %PDF for a board with 2 shots", async () => {
    const buf = await renderStoryboardPdf(fixture, "Scene 1");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    // All valid PDFs start with the magic bytes %PDF
    expect(buf.toString("latin1", 0, 4)).toBe("%PDF");
  });

  it("returns a valid PDF buffer when all shots have selectedUrl: null (all placeholders)", async () => {
    const noImagesBoard: SceneBoard = {
      sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      shots: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          scene_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          ordinal: 0,
          size: "CU",
          angle: "low",
          movement: "dolly",
          lens: null,
          action: null,
          shot_number: null,
          status: "suggested",
          provenance: "manual",
          frames: [],
          selectedUrl: null,
        },
      ],
    };

    const buf = await renderStoryboardPdf(noImagesBoard, "Scene 5");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.toString("latin1", 0, 4)).toBe("%PDF");
  });

  it("returns a valid PDF buffer for an empty board (no shots)", async () => {
    const emptyBoard: SceneBoard = {
      sceneId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      shots: [],
    };

    const buf = await renderStoryboardPdf(emptyBoard, "Scene 99");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.toString("latin1", 0, 4)).toBe("%PDF");
  });
});
