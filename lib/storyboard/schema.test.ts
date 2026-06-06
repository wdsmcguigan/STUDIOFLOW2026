import { describe, it, expect } from "vitest";
import {
  projectVisualSettings,
  visualReference,
  shotListOutput,
} from "./schema";

// ---- projectVisualSettings read-row parse -----------------------------------

describe("projectVisualSettings read-row", () => {
  const validRow = {
    id: crypto.randomUUID(),
    project_id: crypto.randomUUID(),
    style_preset: "cinematic",
    aspect_ratio: "16:9",
    custom_style_prompt: null,
    created_at: "2026-06-06T00:00:00Z",
    updated_at: "2026-06-06T00:00:00Z",
  };

  it("parses a valid row", () => {
    const result = projectVisualSettings.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it("parses with a non-null custom_style_prompt", () => {
    const result = projectVisualSettings.safeParse({
      ...validRow,
      custom_style_prompt: "dark, noir, high contrast",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.custom_style_prompt).toBe("dark, noir, high contrast");
    }
  });

  it("rejects a row missing project_id", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { project_id: _, ...rest } = validRow;
    const result = projectVisualSettings.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ---- visualReference read-row parse -----------------------------------------

describe("visualReference read-row", () => {
  const validRow = {
    id: crypto.randomUUID(),
    project_id: crypto.randomUUID(),
    subject_type: "character",
    source: "upload",
    status: "approved",
    is_primary: false,
    image_path: "projects/abc/refs/hero.jpg",
    character_id: crypto.randomUUID(),
    location_id: null,
    prompt_used: null,
    generation_metadata: null,
    created_by: crypto.randomUUID(),
    created_at: "2026-06-06T00:00:00Z",
    updated_at: "2026-06-06T00:00:00Z",
  };

  it("parses a valid row", () => {
    const result = visualReference.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it("parses a row with null character_id and non-null location_id", () => {
    const result = visualReference.safeParse({
      ...validRow,
      character_id: null,
      location_id: crypto.randomUUID(),
      subject_type: "location",
    });
    expect(result.success).toBe(true);
  });

  it("parses a row with generation_metadata present (loose unknown)", () => {
    const result = visualReference.safeParse({
      ...validRow,
      source: "ai",
      prompt_used: "cinematic hero portrait",
      generation_metadata: { model: "imagen-3", seed: 42 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a row missing id", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...rest } = validRow;
    const result = visualReference.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ---- shotListOutput ---------------------------------------------------------

describe("shotListOutput", () => {
  const validOutput = {
    schemaVersion: 1,
    shots: [
      {
        size: "CU",
        angle: "low",
        movement: "static",
        lens: null,
        action: "Mary draws",
      },
    ],
  };

  it("accepts a valid shot list", () => {
    const result = shotListOutput.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("accepts a shot with lens string", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: [{ size: "WS", angle: "eye", movement: "pan", lens: "35mm", action: "Camera pans across skyline" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a shot without lens field (optional)", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: [{ size: "MS", angle: "high", movement: "tilt", action: "Character looks up" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown size (HUGE)", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: [{ size: "HUGE", angle: "eye", movement: "static", action: "Something happens" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown angle", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: [{ size: "CU", angle: "weird", movement: "static", action: "Something happens" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown movement", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: [{ size: "CU", angle: "eye", movement: "warp", action: "Something happens" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty action string", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: [{ size: "CU", angle: "eye", movement: "static", action: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 shots", () => {
    const shot = { size: "CU", angle: "eye", movement: "static", action: "Mary draws" };
    const result = shotListOutput.safeParse({
      schemaVersion: 1,
      shots: Array(21).fill(shot),
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    const result = shotListOutput.safeParse({
      schemaVersion: 2,
      shots: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty shots array", () => {
    const result = shotListOutput.safeParse({ schemaVersion: 1, shots: [] });
    expect(result.success).toBe(true);
  });
});
