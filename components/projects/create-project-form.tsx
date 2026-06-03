"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Button type="submit">Create</Button>
    </form>
  );
}
