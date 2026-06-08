"use client";

import * as React from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Project } from "@/lib/projects/schema";
import type { ProjectScope } from "@/lib/projects/schema";
import {
  renameProjectAction,
  archiveProjectAction,
  unarchiveProjectAction,
  deleteProjectAction,
  restoreProjectAction,
  purgeProjectAction,
} from "@/app/dashboard/actions";

function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

/**
 * Per-card lifecycle menu. The list stays server-rendered; this is the only
 * interactive island. Menu items run server actions (RLS-guarded); Rename and
 * permanent-delete escalate to a controlled dialog.
 */
export function ProjectActionsMenu({
  project,
  scope,
}: {
  project: Project;
  scope: ProjectScope;
}) {
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const run = (action: (form: FormData) => Promise<void>) =>
    startTransition(() => {
      void action(fd({ projectId: project.id }));
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Manage ${project.title}`}
              disabled={pending}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {scope === "trashed" ? (
            <>
              <DropdownMenuItem onClick={() => run(restoreProjectAction)}>
                Restore
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setPurgeOpen(true)}>
                Delete permanently
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>Rename</DropdownMenuItem>
              {scope === "archived" ? (
                <DropdownMenuItem onClick={() => run(unarchiveProjectAction)}>
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => run(archiveProjectAction)}>
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                render={<a href={`/dashboard/${project.id}/export`} download />}
              >
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => run(deleteProjectAction)}>
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form
            action={(form) => {
              form.append("projectId", project.id);
              startTransition(() => {
                void renameProjectAction(form);
              });
              setRenameOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>Give “{project.title}” a new name.</DialogDescription>
            </DialogHeader>
            <Input
              name="title"
              defaultValue={project.title}
              maxLength={200}
              required
              autoFocus
              aria-label="Project title"
              className="mt-1"
            />
            <DialogFooter className="mt-1">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permanent delete (purge) — type-to-confirm. Keyed so it remounts (and
          clears the confirm field) each time it opens, without a setState effect. */}
      <PurgeDialog
        key={purgeOpen ? "open" : "closed"}
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        title={project.title}
        onConfirm={() => {
          run(purgeProjectAction);
          setPurgeOpen(false);
        }}
      />
    </>
  );
}

function PurgeDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onConfirm: () => void;
}) {
  const [confirm, setConfirm] = React.useState("");
  const matches = confirm.trim() === title.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{title}” permanently?</DialogTitle>
          <DialogDescription>
            This cannot be undone. The project and all of its scripts, breakdown, schedule,
            budget, call sheets, and storyboards are permanently deleted. Type the project name
            to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={title}
          aria-label="Type the project name to confirm"
          autoFocus
        />
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" variant="destructive" disabled={!matches} onClick={onConfirm}>
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
