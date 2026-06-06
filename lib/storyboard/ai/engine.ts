/**
 * Swappable image-generation engine for storyboard frames.
 *
 * Gemini Flash Image is a multimodal LLM: call `generateText`, pass references
 * as image content parts, and read generated images from `result.files`.
 * `result.files` is `Array<GeneratedFile>` where each element exposes:
 *   - `.uint8Array: Uint8Array`  (getter — NOT a method call)
 *   - `.mediaType: string`
 * Verified against ai@6.x types in node_modules/ai/dist/index.d.ts (line 614).
 *
 * `FakeImageEngine` is the deterministic test double; select it by setting
 * the env var `STORYBOARD_FAKE_ENGINE=1`.
 */
import "server-only";
import { generateText } from "ai";
import { getImageModel } from "@/lib/storyboard/ai/model";
import type { RefImage } from "@/lib/storyboard/schema";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface GenerateArgs {
  prompt: string;
  references: RefImage[];
  aspectRatio: string;
  /** Number of images to request (model-dependent; may be ignored). */
  n?: number;
}

export interface GenerateResult {
  images: Uint8Array[];
  meta: Record<string, unknown>;
}

export interface ImageEngine {
  generate(args: GenerateArgs): Promise<GenerateResult>;
}

// ---------------------------------------------------------------------------
// GeminiImageEngine — production engine
// ---------------------------------------------------------------------------

/**
 * Calls Gemini Flash Image via `generateText` (multimodal LLM path).
 * Reference images are passed as `image` content parts with signed URLs.
 * Generated images are read from `result.files`, filtered to image/* media types.
 */
export class GeminiImageEngine implements ImageEngine {
  async generate({
    prompt,
    references,
    aspectRatio,
  }: GenerateArgs): Promise<GenerateResult> {
    const model = getImageModel();

    const result = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...references.map((r) => ({
              type: "image" as const,
              image: new URL(r.signedUrl),
              mediaType: r.mediaType,
            })),
          ],
        },
      ],
    });

    // result.files: Array<GeneratedFile>
    // Each GeneratedFile has:
    //   .uint8Array (Uint8Array getter) — confirmed from ai@6 types
    //   .mediaType (string)
    const images = (result.files ?? [])
      .filter((f) => f.mediaType?.startsWith("image/"))
      .map((f) => f.uint8Array);

    return {
      images,
      meta: {
        model:
          typeof model === "object" && model !== null && "modelId" in model
            ? String((model as Record<string, unknown>).modelId)
            : process.env.STORYBOARD_IMAGE_MODEL ?? "gemini-2.5-flash-image",
        aspectRatio,
        refCount: references.length,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// FakeImageEngine — deterministic test double
// ---------------------------------------------------------------------------

/**
 * Returns a 1×1 PNG stub with no network calls.
 * Echoes `prompt`, reference labels (falling back to signedUrl), and
 * `aspectRatio` into `meta` so callers can assert on wiring.
 */
export class FakeImageEngine implements ImageEngine {
  async generate({
    prompt,
    references,
    aspectRatio,
  }: GenerateArgs): Promise<GenerateResult> {
    // Minimal valid 1×1 transparent PNG header bytes.
    const onePxPng = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    return {
      images: [onePxPng],
      meta: {
        prompt,
        refs: references.map((r) => r.label ?? r.signedUrl),
        aspectRatio,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the active ImageEngine.
 * Set `STORYBOARD_FAKE_ENGINE=1` (e.g. in tests or CI) to get `FakeImageEngine`.
 * Defaults to `GeminiImageEngine`.
 */
export function getImageEngine(): ImageEngine {
  return process.env.STORYBOARD_FAKE_ENGINE === "1"
    ? new FakeImageEngine()
    : new GeminiImageEngine();
}
