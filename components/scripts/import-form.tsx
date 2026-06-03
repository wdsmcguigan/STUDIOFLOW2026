"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Importing…" : "Import"}
    </Button>
  );
}

export function ImportForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="script-title" className="sr-only">
        Script title
      </label>
      <Input id="script-title" name="title" placeholder="Script title" required />
      <label htmlFor="script-source" className="sr-only">
        Fountain source
      </label>
      <textarea
        id="script-source"
        name="source"
        placeholder="Paste Fountain source here"
        required
        rows={16}
        className="rounded border px-3 py-2 font-mono text-sm"
      />
      <SubmitButton />
    </form>
  );
}
