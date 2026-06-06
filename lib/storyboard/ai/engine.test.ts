/**
 * engine.test.ts — covers FakeImageEngine + getImageEngine selection only.
 * No network calls; no real Gemini key required.
 *
 * server-only is mocked because engine.ts imports it (the guard only fires
 * in Next.js RSC compilation; Vitest runs in jsdom and doesn't enforce it).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

// Must appear before the engine import so the module resolver sees the mock.
vi.mock("server-only", () => ({}));

import { FakeImageEngine, getImageEngine } from "@/lib/storyboard/ai/engine";
import type { RefImage } from "@/lib/storyboard/schema";

const REF: RefImage = {
  signedUrl: "https://example.com/char-a.jpg",
  mediaType: "image/jpeg",
  label: "char-a",
};

const REF_NO_LABEL: RefImage = {
  signedUrl: "https://example.com/loc.jpg",
  mediaType: "image/jpeg",
};

describe("FakeImageEngine", () => {
  it("returns a non-empty Uint8Array image", async () => {
    const engine = new FakeImageEngine();
    const result = await engine.generate({
      prompt: "A detective enters the rain-soaked alley.",
      references: [REF],
      aspectRatio: "16:9",
    });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toBeInstanceOf(Uint8Array);
    expect(result.images[0].length).toBeGreaterThan(0);
  });

  it("echoes prompt into meta", async () => {
    const engine = new FakeImageEngine();
    const prompt = "Close-up on the revolver.";
    const result = await engine.generate({ prompt, references: [], aspectRatio: "2.39:1" });
    expect(result.meta.prompt).toBe(prompt);
  });

  it("echoes reference labels into meta (falls back to signedUrl when label absent)", async () => {
    const engine = new FakeImageEngine();
    const result = await engine.generate({
      prompt: "test",
      references: [REF, REF_NO_LABEL],
      aspectRatio: "16:9",
    });
    const refs = result.meta.refs as string[];
    expect(refs).toEqual(["char-a", REF_NO_LABEL.signedUrl]);
  });

  it("echoes aspectRatio into meta", async () => {
    const engine = new FakeImageEngine();
    const result = await engine.generate({ prompt: "p", references: [], aspectRatio: "4:3" });
    expect(result.meta.aspectRatio).toBe("4:3");
  });
});

describe("getImageEngine", () => {
  const originalEnv = process.env.STORYBOARD_FAKE_ENGINE;

  beforeEach(() => {
    delete process.env.STORYBOARD_FAKE_ENGINE;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.STORYBOARD_FAKE_ENGINE;
    } else {
      process.env.STORYBOARD_FAKE_ENGINE = originalEnv;
    }
  });

  it("returns a FakeImageEngine when STORYBOARD_FAKE_ENGINE=1", async () => {
    process.env.STORYBOARD_FAKE_ENGINE = "1";
    const engine = getImageEngine();
    expect(engine).toBeInstanceOf(FakeImageEngine);
    // Also confirm it still generates correctly via the interface.
    const result = await engine.generate({ prompt: "p", references: [], aspectRatio: "16:9" });
    expect(result.images).toHaveLength(1);
  });

  it("returns a non-FakeImageEngine (GeminiImageEngine) when env var is absent", () => {
    // No Gemini key available in test env — we only check the class identity.
    const engine = getImageEngine();
    expect(engine).not.toBeInstanceOf(FakeImageEngine);
    // Verify it has a generate method (satisfies ImageEngine interface).
    expect(typeof engine.generate).toBe("function");
  });
});
