"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ember"
      disabled={pending}
      className="h-9 font-bold"
    >
      {pending ? "Importing…" : "Import script"}
    </Button>
  );
}

export function ImportForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="script-title">Script title</Label>
        <Input
          id="script-title"
          name="title"
          placeholder="e.g. Nighthawk"
          required
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="script-source">Fountain source</Label>
        <Textarea
          id="script-source"
          name="source"
          placeholder="Paste Fountain source here…"
          required
          rows={16}
          className="font-data min-h-[280px] resize-y bg-[var(--s2)] text-sm leading-relaxed"
          style={{
            border: "1px solid var(--line-2)",
            borderRadius: "calc(var(--radius) * 0.8)",
          }}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
