import { describe, it, expect } from "vitest";
import { reconcile, type ExistingScene } from "@/lib/scripts/reconcile";
import { contentHash } from "@/lib/scripts/hash";
import type { ParsedScene } from "@/lib/scripts/schema";

function parsed(over: Partial<ParsedScene> & { ordinal: number }): ParsedScene {
  return {
    sceneNumber: null,
    intExt: "INT",
    locationSlug: "DINER",
    timeOfDay: "DAY",
    bodyText: "Mary sits alone.",
    synopsis: "",
    pageEighths: 8,
    textAnchorStart: 0,
    textAnchorEnd: 10,
    ...over,
  };
}

function existingFrom(p: ParsedScene, id: string, opts: { locked?: boolean } = {}): ExistingScene {
  return {
    sceneId: id,
    sceneNumber: p.sceneNumber,
    numberLocked: opts.locked ?? false,
    contentHash: contentHash(p),
    intExt: p.intExt,
    locationSlug: p.locationSlug,
    timeOfDay: p.timeOfDay,
    bodyText: p.bodyText,
    ordinal: p.ordinal,
  };
}

describe("reconcile — tier 2 (slugline + content hash)", () => {
  it("classifies an unchanged scene and preserves its id", () => {
    const a = parsed({ ordinal: 0 });
    const existing = [existingFrom(a, "id-a")];
    const diff = reconcile(existing, [parsed({ ordinal: 0 })]);
    const entry = diff.find((d) => d.sceneId === "id-a")!;
    expect(entry.classification).toBe("unchanged");
    expect(entry.confidence).toBe(1);
  });

  it("classifies a modified scene (same slug, changed body) and keeps the id", () => {
    const a = parsed({ ordinal: 0, bodyText: "Mary sits alone." });
    const existing = [existingFrom(a, "id-a")];
    const diff = reconcile(existing, [parsed({ ordinal: 0, bodyText: "Mary stands and leaves." })]);
    const entry = diff.find((d) => d.sceneId === "id-a")!;
    expect(entry.classification).toBe("modified");
  });

  it("classifies a brand-new scene as new with no matched id", () => {
    const a = parsed({ ordinal: 0 });
    const existing = [existingFrom(a, "id-a")];
    const incoming = [
      parsed({ ordinal: 0 }),
      parsed({ ordinal: 1, locationSlug: "ROOFTOP", bodyText: "Wind howls." }),
    ];
    const diff = reconcile(existing, incoming);
    const news = diff.filter((d) => d.classification === "new");
    expect(news).toHaveLength(1);
    expect(news[0].sceneId).toBeNull();
    expect(news[0].parsed?.locationSlug).toBe("ROOFTOP");
  });

  it("marks a removed scene as removed (not deleted), preserving its id", () => {
    const a = parsed({ ordinal: 0 });
    const b = parsed({ ordinal: 1, locationSlug: "ROOFTOP", bodyText: "Wind howls." });
    const existing = [existingFrom(a, "id-a"), existingFrom(b, "id-b")];
    const diff = reconcile(existing, [parsed({ ordinal: 0 })]);
    const removed = diff.find((d) => d.classification === "removed")!;
    expect(removed.sceneId).toBe("id-b");
  });
});

describe("reconcile — tier 1 (locked-number key join)", () => {
  it("matches locked 5A <-> 5A exactly even if body changed", () => {
    const a = parsed({ ordinal: 0, sceneNumber: "5A", bodyText: "Original." });
    const existing = [existingFrom(a, "id-5a", { locked: true })];
    const incoming = [parsed({ ordinal: 0, sceneNumber: "5A", bodyText: "Heavily rewritten." })];
    const diff = reconcile(existing, incoming);
    const entry = diff.find((d) => d.sceneId === "id-5a")!;
    expect(["unchanged", "modified"]).toContain(entry.classification);
    expect(entry.confidence).toBe(1); // tier-1 exact key join
  });

  it("treats a locked number absent from the import as removed -> OMITTED", () => {
    const a = parsed({ ordinal: 0, sceneNumber: "5A" });
    const b = parsed({ ordinal: 1, sceneNumber: "6", locationSlug: "ALLEY", bodyText: "Dark." });
    const existing = [
      existingFrom(a, "id-5a", { locked: true }),
      existingFrom(b, "id-6", { locked: true }),
    ];
    const incoming = [parsed({ ordinal: 0, sceneNumber: "5A" })];
    const diff = reconcile(existing, incoming);
    const removed = diff.find((d) => d.classification === "removed")!;
    expect(removed.sceneId).toBe("id-6");
  });
});

import { reconcile as reconcileT3, fuzzyMatcher, type ExistingScene as ES } from "@/lib/scripts/reconcile";
import { contentHash as hash } from "@/lib/scripts/hash";

function p3(over: Partial<ParsedScene> & { ordinal: number }): ParsedScene {
  return {
    sceneNumber: null,
    intExt: "INT",
    locationSlug: "DINER",
    timeOfDay: "DAY",
    bodyText: "Mary sits alone at the counter sipping cold coffee.",
    synopsis: "",
    pageEighths: 8,
    textAnchorStart: 0,
    textAnchorEnd: 10,
    ...over,
  };
}

function e3(p: ParsedScene, id: string): ES {
  return {
    sceneId: id,
    sceneNumber: p.sceneNumber,
    numberLocked: false,
    contentHash: hash(p),
    intExt: p.intExt,
    locationSlug: p.locationSlug,
    timeOfDay: p.timeOfDay,
    bodyText: p.bodyText,
    ordinal: p.ordinal,
  };
}

describe("reconcile — tier 3 (fuzzy)", () => {
  it("matches an edited+renamed scene above the confidence threshold and keeps the id", () => {
    const original = p3({ ordinal: 0, bodyText: "Mary sits alone at the counter sipping cold coffee." });
    const existing = [e3(original, "id-a")];
    // Slug changed AND body lightly edited -> escapes tiers 1 & 2, caught by tier 3.
    const incoming = [
      p3({ ordinal: 0, locationSlug: "DINER COUNTER", bodyText: "Mary sits alone at the counter sipping her cold coffee." }),
    ];
    const diff = reconcileT3(existing, incoming, fuzzyMatcher);
    const entry = diff.find((d) => d.sceneId === "id-a")!;
    expect(entry.classification).toBe("modified");
    expect(entry.confidence).toBeGreaterThan(0);
    expect(entry.confidence).toBeLessThan(1);
  });

  it("does NOT fuzzy-match two unrelated scenes (below threshold => new + removed)", () => {
    const original = p3({ ordinal: 0, bodyText: "Mary sits alone at the counter sipping cold coffee." });
    const existing = [e3(original, "id-a")];
    const incoming = [p3({ ordinal: 0, locationSlug: "SUBMARINE", bodyText: "Torpedoes scream through the dark water." })];
    const diff = reconcileT3(existing, incoming, fuzzyMatcher);
    expect(diff.some((d) => d.classification === "new" && d.parsed?.locationSlug === "SUBMARINE")).toBe(true);
    expect(diff.some((d) => d.classification === "removed" && d.sceneId === "id-a")).toBe(true);
  });
});
