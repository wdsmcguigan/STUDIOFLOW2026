import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DensityToggle } from "@/components/layout/density-toggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-density");
});

describe("DensityToggle", () => {
  it("switches to compact, sets the attribute, and persists", async () => {
    render(<DensityToggle />);
    await userEvent.click(screen.getByRole("button", { name: /density|compact|comfortable/i }));
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(localStorage.getItem("sf-density")).toBe("compact");
  });
});
