import { describe, it, expect } from "vitest";
import {
  textAnchor,
  presenceType,
  tagStatus,
  provenance,
  anchorState,
  createElementInput,
  character,
} from "@/lib/breakdown/schema";

describe("breakdown schema", () => {
  it("textAnchor defaults prefix/suffix and allows null hint", () => {
    expect(textAnchor.parse({ quote: "chrome revolver" })).toEqual({
      quote: "chrome revolver",
      prefix: "",
      suffix: "",
      hintOffset: null,
    });
  });
  it("enums reject junk", () => {
    expect(presenceType.safeParse("lead").success).toBe(false);
    expect(tagStatus.safeParse("maybe").success).toBe(false);
    expect(provenance.safeParse("ai").success).toBe(false);
    expect(anchorState.safeParse("lost").success).toBe(false);
  });
  it("createElementInput requires project + category + name", () => {
    expect(
      createElementInput.safeParse({
        projectId: crypto.randomUUID(),
        categoryId: crypto.randomUUID(),
        name: "Knife",
      }).success
    ).toBe(true);
    expect(createElementInput.safeParse({ name: "" }).success).toBe(false);
  });
  it("character row parses aliases array", () => {
    const c = character.parse({
      id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      primary_name: "BOB",
      aliases: ["ROBERT"],
      description: null,
      cast_person_id: null,
      created_at: "t",
      updated_at: "t",
    });
    expect(c.aliases).toEqual(["ROBERT"]);
  });
});
