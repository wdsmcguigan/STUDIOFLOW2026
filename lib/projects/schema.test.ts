import { describe, it, expect } from "vitest";
import { createProjectInput } from "@/lib/projects/schema";

describe("createProjectInput", () => {
  it("accepts a valid title", () => {
    const result = createProjectInput.safeParse({ title: "My Film" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createProjectInput.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("trims and defaults status to development", () => {
    const parsed = createProjectInput.parse({ title: "  Untitled  " });
    expect(parsed.title).toBe("Untitled");
    expect(parsed.status).toBe("development");
  });

  it("rejects a title over 200 characters", () => {
    const result = createProjectInput.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = createProjectInput.safeParse({ title: "X", status: "limbo" });
    expect(result.success).toBe(false);
  });
});
