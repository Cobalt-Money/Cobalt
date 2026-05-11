"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { cn } from "../../lib/utils";

const POOL_ID = "__pool__";

export interface ColumnMappingBoardProps<Target extends string> {
  headers: readonly string[];
  sample: Record<string, unknown>;
  /** All possible targets, in render order. Must include the unassigned sentinel. */
  targets: readonly Target[];
  /** Sentinel value meaning "no target assigned" — those tiles live in the pool. */
  unassigned: Target;
  /** Friendly labels for target slots. */
  targetLabels: Record<Target, string>;
  /** Optional example value rendered under each target label as a mapping hint. */
  targetExamples?: Partial<Record<Target, string>>;
  /** Required targets — render with destructive border when empty. */
  requiredTargets?: readonly Target[];
  byColumn: Record<string, Target>;
  onChange: (column: string, target: Target) => void;
}

export function ColumnMappingBoard<Target extends string>({
  headers,
  sample,
  targets,
  unassigned,
  targetLabels,
  targetExamples,
  requiredTargets = [],
  byColumn,
  onChange,
}: ColumnMappingBoardProps<Target>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [draggingCol, setDraggingCol] = useState<string | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingCol(String(e.active.id));
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingCol(null);
    if (!e.over) {
      return;
    }
    const col = String(e.active.id);
    const overId = String(e.over.id);
    const target = overId === POOL_ID ? unassigned : (overId as Target);
    const fromTarget = byColumn[col] ?? unassigned;
    if (fromTarget === target) {
      return;
    }

    // 1:1 enforcement: if target already holds another column, swap it back to dragged col's prior slot.
    if (target !== unassigned) {
      const prev = Object.entries(byColumn).find(([c, t]) => t === target && c !== col);
      if (prev) {
        onChange(prev[0], fromTarget);
      }
    }
    onChange(col, target);
  };

  const colsForTarget = (t: Target) => headers.filter((h) => (byColumn[h] ?? unassigned) === t);

  const poolCols = colsForTarget(unassigned);
  const assignedTargets = targets.filter((t) => t !== unassigned);

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragCancel={() => setDraggingCol(null)}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div className="flex flex-col gap-4">
        <PoolZone>
          <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            CSV Columns
          </div>
          <div className="flex flex-wrap gap-2">
            {poolCols.length === 0 ? (
              <div className="w-full rounded-md border border-dashed p-3 text-center text-muted-foreground text-xs">
                All columns assigned. Drag from a slot to unassign.
              </div>
            ) : (
              poolCols.map((h) => (
                <ColumnTile dragging={draggingCol === h} key={h} sample={sample[h]} title={h} />
              ))
            )}
          </div>
        </PoolZone>

        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1.4fr)] border-b bg-muted/40 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            <div className="px-4 py-2">Cobalt field</div>
            <div className="py-2 text-center" />
            <div className="px-4 py-2">Your CSV column</div>
          </div>
          <div className="divide-y">
            {assignedTargets.map((t) => (
              <TargetSlot
                cols={colsForTarget(t)}
                example={targetExamples?.[t]}
                isRequired={requiredTargets.includes(t)}
                key={t}
                label={targetLabels[t]}
                sample={sample}
                targetId={t}
              />
            ))}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {draggingCol ? (
          <ColumnTile elevated sample={sample[draggingCol]} title={draggingCol} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PoolZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: POOL_ID });
  return (
    <div
      className={cn(
        "rounded-md border bg-muted/30 p-3 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

function TargetSlot<Target extends string>({
  cols,
  example,
  isRequired,
  label,
  sample,
  targetId,
}: {
  cols: string[];
  example?: string;
  isRequired: boolean;
  label: string;
  sample: Record<string, unknown>;
  targetId: Target;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: targetId });
  const empty = cols.length === 0;
  return (
    <div
      className={cn(
        "grid min-h-[68px] grid-cols-[minmax(0,1fr)_40px_minmax(0,1.4fr)] items-center transition-colors",
        empty && isRequired && "bg-destructive/5",
        isOver && "bg-primary/5",
      )}
      ref={setNodeRef}
    >
      <div className="flex flex-col gap-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">{label}</div>
          {isRequired && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
              required
            </span>
          )}
        </div>
        {example && (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Example
            </span>
            <span className="w-fit rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
              {example}
            </span>
          </div>
        )}
      </div>
      <div
        className={cn(
          "text-center font-mono text-lg",
          empty ? "text-muted-foreground/40" : "text-primary",
        )}
      >
        →
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {empty ? (
          <div className="w-full rounded-md border border-dashed py-2 text-center text-muted-foreground text-xs italic">
            drop a CSV column here
          </div>
        ) : (
          cols.map((h) => <ColumnTile key={h} sample={sample[h]} title={h} />)
        )}
      </div>
    </div>
  );
}

function ColumnTile({
  dragging,
  elevated,
  sample,
  title,
}: {
  dragging?: boolean;
  elevated?: boolean;
  sample: unknown;
  title: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: title });
  const style = transform
    ? { transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)` }
    : undefined;
  return (
    <div
      className={cn(
        "min-w-[140px] max-w-[220px] cursor-grab select-none rounded-md border bg-card px-3 py-2 shadow-xs active:cursor-grabbing",
        dragging && "opacity-40",
        elevated && "shadow-lg ring-2 ring-primary/40",
      )}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="mt-1 flex flex-col gap-0.5">
        <span className="font-medium text-[10px] text-primary/70 uppercase tracking-wide">
          Your value
        </span>
        <div className="w-fit max-w-full truncate rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs">
          {String(sample ?? "—")}
        </div>
      </div>
    </div>
  );
}
