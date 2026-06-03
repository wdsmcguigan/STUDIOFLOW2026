import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportForm } from "@/components/scripts/import-form";

describe("ImportForm", () => {
  it("submits the entered title and pasted Fountain source", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(<ImportForm action={action} />);

    await userEvent.type(screen.getByPlaceholderText("Script title"), "Pilot");
    await userEvent.type(
      screen.getByPlaceholderText("Paste Fountain source here"),
      "INT. DINER - DAY",
    );
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(action).toHaveBeenCalled();
    const fd = action.mock.calls[0][0] as FormData;
    expect(fd.get("title")).toBe("Pilot");
    expect(fd.get("source")).toContain("INT. DINER");
  });
});
