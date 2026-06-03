"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  // Disable while the server action is in flight so a double-click can't
  // create duplicate projects.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Creating…" : "Create"}
    </Button>
  );
}

export function CreateProjectForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex gap-2">
      <label htmlFor="project-title" className="sr-only">
        Project title
      </label>
      <Input id="project-title" name="title" placeholder="Project title" required />
      <SubmitButton />
    </form>
  );
}
