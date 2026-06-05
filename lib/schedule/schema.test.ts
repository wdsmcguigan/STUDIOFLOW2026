import { describe, it, expect } from "vitest";
import {
  dayType,
  unit,
  stripType,
  doodCode,
  createShootDayInput,
} from "@/lib/schedule/schema";

describe("schedule schema", () => {
  it("enums reject junk", () => {
    expect(unit.safeParse("aerial").success).toBe(false);
    expect(dayType.safeParse("party").success).toBe(false);
    expect(stripType.safeParse("scene").success).toBe(true);
    expect(doodCode.safeParse("SWF").success).toBe(true);
    expect(doodCode.safeParse("ZZ").success).toBe(false);
  });

  it("createShootDayInput requires project + valid unit/day_type with defaults", () => {
    const r = createShootDayInput.parse({ projectId: globalThis.crypto.randomUUID() });
    expect(r.unit).toBe("main");
    expect(r.dayType).toBe("shoot");
  });
});
