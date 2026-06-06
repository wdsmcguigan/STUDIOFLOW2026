"use client";

import { useRef, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import type { ShotWithFrames } from "@/lib/storyboard/schema";
import { reorderShotsAction } from "@/app/dashboard/[projectId]/storyboard/actions";
import { SortableShotCard } from "@/components/storyboard/shot-card";

interface BoardGridProps {
  projectId: string;
  sceneId: string;
  shots: ShotWithFrames[];
}

/**
 * Board grid — a rectangular sortable grid of shot cards (dnd-kit).
 *
 * Drag (PointerSensor) and keyboard (KeyboardSensor) reordering for a11y.
 * On drag end, arrayMove computes the new order and the resulting id order is
 * submitted to reorderShotsAction (server) inside a transition. Local state is
 * updated optimistically; the server revalidate re-syncs ordinals.
 */
export function BoardGrid({ projectId, sceneId, shots }: BoardGridProps) {
  const [items, setItems] = useState<ShotWithFrames[]>(shots);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const orderedRef = useRef<HTMLInputElement>(null);

  // Re-sync during render (not in an effect) when the server sends fresh shots
  // — e.g. after a render revalidate adds frames, or a shot is added/deleted.
  // We track the last-seen server order by id; if it changed, adopt it.
  const serverKey = shots
    .map((s) => `${s.id}:${s.frames.length}:${s.selectedUrl ? 1 : 0}`)
    .join(",");
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setItems(shots);
    setLastKey(serverKey);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);

    // Submit the new id order to the server action via the hidden form.
    if (orderedRef.current && formRef.current) {
      orderedRef.current.value = JSON.stringify(next.map((s) => s.id));
      const form = formRef.current;
      startTransition(() => {
        form.requestSubmit();
      });
    }
  }

  return (
    <>
      {/* Hidden form carries the reorder submission to the server action. */}
      <form ref={formRef} action={reorderShotsAction} className="hidden">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sceneId" value={sceneId} />
        <input ref={orderedRef} type="hidden" name="orderedIds" defaultValue="" />
      </form>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((shot, index) => (
              <SortableShotCard
                key={shot.id}
                projectId={projectId}
                sceneId={sceneId}
                shot={shot}
                panelNumber={index + 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
