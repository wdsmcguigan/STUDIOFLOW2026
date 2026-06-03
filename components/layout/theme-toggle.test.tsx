import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-themes before importing the component
const mockSetTheme = vi.fn();
let mockTheme = "dark";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

import { ThemeToggle } from "@/components/layout/theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockTheme = "dark";
  });

  it("renders a button with an accessible name containing 'theme'", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /theme/i })).toBeTruthy();
  });

  it("calls setTheme with 'light' when current theme is dark", async () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme with 'dark' when current theme is light", async () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
