import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation before importing the component under test
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// cmdk uses ResizeObserver and scrollIntoView internally; jsdom doesn't provide them
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // jsdom does not implement scrollIntoView
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

import { CommandPalette } from "@/components/layout/command-palette";

describe("CommandPalette", () => {
  it("renders nav and AI actions when open", () => {
    render(<CommandPalette projectId="p1" open onOpenChange={() => {}} />);
    expect(screen.getByText(/Script/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule/)).toBeInTheDocument();
    expect(screen.getByText(/Ask AI/i)).toBeInTheDocument();
  });
});
