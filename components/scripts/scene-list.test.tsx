import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceneList } from "@/components/scripts/scene-list";
import type { Scene } from "@/lib/scripts/schema";

const scenes: Scene[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    project_id: "22222222-2222-2222-2222-222222222222",
    script_id: "33333333-3333-3333-3333-333333333333",
    ordinal: 0,
    scene_number: "1",
    number_locked: false,
    int_ext: "INT",
    location_slug: "DINER",
    time_of_day: "DAY",
    synopsis: "Mary waits.",
    page_eighths: 8,
    script_day: "D1",
    status: "active",
    created_at: "2026-06-03T00:00:00Z",
    updated_at: "2026-06-03T00:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    project_id: "22222222-2222-2222-2222-222222222222",
    script_id: "33333333-3333-3333-3333-333333333333",
    ordinal: 1,
    scene_number: "2",
    number_locked: false,
    int_ext: "EXT",
    location_slug: "PARKING LOT",
    time_of_day: "NIGHT",
    synopsis: "The car idles.",
    page_eighths: 4,
    script_day: null,
    status: "omitted",
    created_at: "2026-06-03T00:00:00Z",
    updated_at: "2026-06-03T00:00:00Z",
  },
];

describe("SceneList", () => {
  it("renders each scene with number, INT/EXT, slug, time, and eighths", () => {
    render(<SceneList projectId="p" scriptId="s" scenes={scenes} />);
    expect(screen.getByText("DINER")).toBeInTheDocument();
    expect(screen.getByText("PARKING LOT")).toBeInTheDocument();
    expect(screen.getByText("INT")).toBeInTheDocument();
    expect(screen.getByText("EXT")).toBeInTheDocument();
    expect(screen.getByText("DAY")).toBeInTheDocument();
  });

  it("marks omitted scenes", () => {
    render(<SceneList projectId="p" scriptId="s" scenes={scenes} />);
    expect(screen.getByText(/omitted/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no scenes", () => {
    render(<SceneList projectId="p" scriptId="s" scenes={[]} />);
    expect(screen.getByText(/no scenes/i)).toBeInTheDocument();
  });
});
