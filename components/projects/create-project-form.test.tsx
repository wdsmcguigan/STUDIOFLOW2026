import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProjectForm } from "@/components/projects/create-project-form";

describe("CreateProjectForm", () => {
  it("calls the action with the entered title", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(<CreateProjectForm action={action} />);
    await userEvent.type(screen.getByPlaceholderText("Project title"), "Heat 2");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(action).toHaveBeenCalled();
    const fd = action.mock.calls[0][0] as FormData;
    expect(fd.get("title")).toBe("Heat 2");
  });
});
