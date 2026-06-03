import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFountain } from "@/lib/scripts/fountain";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf8");

describe("parseFountain", () => {
  it("extracts both scenes from a simple script with INT/EXT, slug, and time", () => {
    const scenes = parseFountain(fixture("simple.fountain"));
    expect(scenes).toHaveLength(2);

    expect(scenes[0].intExt).toBe("INT");
    expect(scenes[0].locationSlug).toBe("DINER");
    expect(scenes[0].timeOfDay).toBe("DAY");
    expect(scenes[0].ordinal).toBe(0);

    expect(scenes[1].intExt).toBe("EXT");
    expect(scenes[1].locationSlug).toBe("PARKING LOT");
    expect(scenes[1].timeOfDay).toBe("NIGHT");
    expect(scenes[1].ordinal).toBe(1);
  });

  it("captures body text under each heading", () => {
    const scenes = parseFountain(fixture("simple.fountain"));
    expect(scenes[0].bodyText).toContain("Mary sits alone");
    expect(scenes[0].bodyText).toContain("Coffee. Black.");
    expect(scenes[1].bodyText).toContain("A car idles");
  });

  it("parses INT/EXT combos, a 5A scene number, a synopsis line, and OMITTED", () => {
    const scenes = parseFountain(fixture("tricky.fountain"));
    expect(scenes).toHaveLength(4);

    // INT./EXT. combo normalized to INT/EXT, scene number from #5A#.
    expect(scenes[0].intExt).toBe("INT/EXT");
    expect(scenes[0].locationSlug).toBe("PATROL CAR");
    expect(scenes[0].timeOfDay).toBe("NIGHT");
    expect(scenes[0].sceneNumber).toBe("5A");
    // The "=" synopsis line is captured as synopsis, not body.
    expect(scenes[0].synopsis).toBe("They tail the suspect through downtown.");
    expect(scenes[0].bodyText).not.toContain("They tail the suspect");

    // CONTINUOUS is captured as the time-of-day token.
    expect(scenes[3].timeOfDay).toBe("CONTINUOUS");
    expect(scenes[3].bodyText).toContain("OMITTED");
  });

  it("assigns monotonically increasing text anchors", () => {
    const scenes = parseFountain(fixture("simple.fountain"));
    expect(scenes[0].textAnchorStart).toBe(0);
    expect(scenes[0].textAnchorEnd).toBeGreaterThan(scenes[0].textAnchorStart);
    expect(scenes[1].textAnchorStart).toBeGreaterThanOrEqual(scenes[0].textAnchorEnd);
  });
});
