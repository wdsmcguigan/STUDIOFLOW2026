import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiffReview } from "@/components/scripts/diff-review";
import type { SceneDiff } from "@/lib/scripts/schema";

const parsed = (slug: string) => ({
  sceneNumber: null, intExt: "INT", locationSlug: slug, timeOfDay: "DAY",
  bodyText: `Body of ${slug}`, synopsis: "", pageEighths: 8,
  textAnchorStart: 0, textAnchorEnd: 1, ordinal: 0,
});

const diff: SceneDiff[] = [
  { classification: "unchanged", sceneId: "id-1", confidence: 1, parsedOrdinal: 0, parsed: parsed("DINER") },
  { classification: "modified", sceneId: "id-2", confidence: 0.7, parsedOrdinal: 1, parsed: parsed("PARK") },
  { classification: "new", sceneId: null, confidence: 0, parsedOrdinal: 2, parsed: parsed("ROOFTOP") },
  { classification: "removed", sceneId: "id-3", confidence: 0, parsedOrdinal: null, parsed: null },
  { classification: "conflict", sceneId: "id-4", confidence: 1, parsedOrdinal: 3, parsed: parsed("LAB") },
];

describe("DiffReview", () => {
  it("renders each classification", () => {
    render(<DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{ "id-4": "In-app: experiment fails." }} confirmAction={vi.fn()} />);
    expect(screen.getByText(/unchanged/i)).toBeInTheDocument();
    expect(screen.getByText(/modified/i)).toBeInTheDocument();
    expect(screen.getByText(/new/i)).toBeInTheDocument();
    expect(screen.getByText(/removed/i)).toBeInTheDocument();
    expect(screen.getByText(/conflict/i)).toBeInTheDocument();
  });

  it("shows the conflict side-by-side with the Final Draft option pre-selected as the default and the in-app edit retained", () => {
    render(<DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{ "id-4": "In-app: experiment fails." }} confirmAction={vi.fn()} />);
    const fdRadio = screen.getByLabelText(/final draft/i) as HTMLInputElement;
    expect(fdRadio.checked).toBe(true);
    expect(screen.getByText(/In-app: experiment fails\./)).toBeInTheDocument();
  });

  it("carries the staged scriptVersionId so confirm applies the right version", () => {
    const { container } = render(
      <DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{}} confirmAction={vi.fn()} />,
    );
    const hidden = container.querySelector('input[name="scriptVersionId"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("ver-1");
  });

  it("calls confirmAction on confirm", async () => {
    const confirmAction = vi.fn().mockResolvedValue(undefined);
    render(<DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{}} confirmAction={confirmAction} />);
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(confirmAction).toHaveBeenCalled();
  });
});
