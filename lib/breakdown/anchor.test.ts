import { describe, it, expect } from "vitest";
import { relocateAnchor } from "@/lib/breakdown/anchor";

describe("relocateAnchor", () => {
  const anchor = { quote: "chrome revolver", prefix: "sets down a ", suffix: ". Outside", hintOffset: null };
  it("exact quote present → anchored, offset updated", () => {
    const text = "He sets down a chrome revolver. Outside it rains.";
    const r = relocateAnchor(anchor, text);
    expect(r.anchorState).toBe("anchored");
    expect(r.anchor.hintOffset).toBe(text.indexOf("chrome revolver"));
  });
  it("text shifted/edited but similar → needs_review", () => {
    const text = "He slowly sets down a chrome-plated revolver on the table.";
    const r = relocateAnchor(anchor, text);
    expect(r.anchorState).toBe("needs_review");
    expect(r.anchor.quote).toBe("chrome revolver"); // original quote retained
  });
  it("quote gone entirely → orphaned, anchor retained", () => {
    const text = "The room is empty and silent.";
    const r = relocateAnchor(anchor, text);
    expect(r.anchorState).toBe("orphaned");
    expect(r.anchor.hintOffset).toBeNull();
  });
});
