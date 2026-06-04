"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { AIDot } from "@/components/ui/ai-surface";

// Only live routes navigate; not-yet-built ones are shown disabled (no 404s).
const NAV = [
  { href: "scripts", label: "Script", soon: false },
  { href: "breakdown", label: "Breakdown", soon: true },
  { href: "schedule", label: "Schedule", soon: true },
  { href: "budget", label: "Budget", soon: true },
  { href: "call-sheets", label: "Call Sheets", soon: true },
];

/**
 * ⌘K command palette — nav actions + AI actions.
 *
 * Controlled: pass `open` + `onOpenChange` (used by tests and the top-bar trigger).
 * Uncontrolled: omit both props; a global cmd/ctrl+k listener manages internal state.
 *
 * Adaptation note: CommandDialog wraps Base UI's Dialog, whose onOpenChange signature
 * is (open: boolean, eventDetails: ...) => void. We cast our (open: boolean) => void
 * setter via an adapter arrow to satisfy the wider signature without weakening types.
 */
export function CommandPalette({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open ?? internalOpen;
  // Adapter: Base UI onOpenChange passes (open, eventDetails) but we only need `open`.
  const setOpen = (o: boolean) => {
    if (onOpenChange) {
      onOpenChange(o);
    } else {
      setInternalOpen(o);
    }
  };

  useEffect(() => {
    if (open !== undefined) return; // controlled: no global listener
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setInternalOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
    >
      {/*
        CommandDialog (Base UI-backed) does not include the cmdk Command context.
        Wrapping children in <Command> provides the context that CommandInput /
        CommandList / CommandItem require (cmdk's subscribe call).
      */}
      <Command>
        <CommandInput placeholder="Search or run a command…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV.map((n) => (
              <CommandItem
                key={n.href}
                disabled={n.soon}
                onSelect={() => {
                  if (n.soon) return;
                  router.push(`/dashboard/${projectId}/${n.href}`);
                  setOpen(false);
                }}
              >
                {n.label}
                {n.soon ? (
                  <span className="ml-auto text-[var(--tx-3)]">Soon</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="AI">
            <CommandItem onSelect={() => setOpen(false)}>
              <AIDot />
              Ask AI…{" "}
              <span className="ml-1 text-[var(--tx-3)]">(coming in Phase 2)</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
