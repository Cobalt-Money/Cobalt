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
import { createPortal } from "react-dom";
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
  /**
   * Slots that are resolved by a typed value (e.g. user provided an account name
   * because no column exists). Renders the value as a locked tile inside the slot
   * instead of a drop zone. `onClear` resets the slot to drop-zone mode.
   */
  lockedSlots?: Partial<Record<Target, { value: string; onClear?: () => void }>>;
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
  lockedSlots,
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
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] border-b bg-muted/40 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            <div className="border-r px-4 py-2">Cobalt field</div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-2">
              <span className="w-4" />
              <span>Your CSV column</span>
              <span>Your value</span>
            </div>
          </div>
          <div className="divide-y">
            {assignedTargets.map((t) => (
              <TargetSlot
                cols={colsForTarget(t)}
                draggingCol={draggingCol}
                example={targetExamples?.[t]}
                isRequired={requiredTargets.includes(t)}
                key={t}
                label={targetLabels[t]}
                lockedValue={lockedSlots?.[t]}
                sample={sample}
                targetId={t}
              />
            ))}
          </div>
        </div>
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {draggingCol ? renderDragPreview(draggingCol, byColumn, unassigned, sample) : null}
          </DragOverlay>,
          document.body,
        )}
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
  draggingCol,
  example,
  isRequired,
  label,
  lockedValue,
  sample,
  targetId,
}: {
  cols: string[];
  draggingCol: string | null;
  example?: string;
  isRequired: boolean;
  label: string;
  lockedValue?: { value: string; onClear?: () => void };
  sample: Record<string, unknown>;
  targetId: Target;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: targetId });
  const empty = cols.length === 0;
  const rowIsSource = draggingCol !== null && cols.includes(draggingCol);
  return (
    <div
      className={cn(
        "grid min-h-[68px] grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center transition-colors",
        empty && isRequired && "bg-destructive/5",
        isOver && "bg-primary/5 ring-2 ring-primary/40 ring-inset",
        rowIsSource && "bg-muted/40 opacity-70",
      )}
      ref={setNodeRef}
    >
      <div className="flex h-full flex-col gap-1 border-r px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">{label}</div>
          {isRequired && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
              required
            </span>
          )}
        </div>
        {example && (
          <span className="w-fit rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
            {example}
          </span>
        )}
      </div>
      <TargetSlotBody cols={cols} empty={empty} lockedValue={lockedValue} sample={sample} />
    </div>
  );
}

function TargetSlotBody({
  cols,
  empty,
  lockedValue,
  sample,
}: {
  cols: string[];
  empty: boolean;
  lockedValue?: { value: string; onClear?: () => void };
  sample: Record<string, unknown>;
}) {
  if (lockedValue) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="grid select-none grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 rounded-md border bg-card px-2 py-3.5 shadow-xs">
          <GripDots />
          <div className="truncate font-medium text-sm">{lockedValue.value}</div>
          <div className="w-fit max-w-full truncate rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs">
            {lockedValue.value}
          </div>
        </div>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="px-4 py-3">
        <div className="w-full rounded-md border border-dashed py-2 text-center text-muted-foreground text-xs italic">
          drop a CSV column here
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {cols.map((h) => (
        <SlotTile key={h} sample={sample[h]} title={h} />
      ))}
    </div>
  );
}

function ColumnTileBody({
  elevated,
  hideSample,
  sample,
  title,
}: {
  elevated?: boolean;
  hideSample?: boolean;
  sample: unknown;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[140px] max-w-[220px] cursor-grab select-none items-center gap-2 rounded-md border bg-card px-2 py-2 shadow-xs active:cursor-grabbing",
        elevated && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      <GripDots />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm">{title}</div>
        {!hideSample && (
          <div className="mt-1 w-fit max-w-full truncate rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs">
            {String(sample ?? "—")}
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnTile({
  dragging,
  elevated,
  hideSample,
  sample,
  title,
}: {
  dragging?: boolean;
  elevated?: boolean;
  hideSample?: boolean;
  sample: unknown;
  title: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({ id: title });
  return (
    <div
      className={cn(
        "flex min-w-[140px] max-w-[220px] cursor-grab select-none items-center gap-2 rounded-md border bg-card px-2 py-2 shadow-xs active:cursor-grabbing",
        (dragging || isDragging) && "opacity-40",
        elevated && "shadow-lg ring-2 ring-primary/40",
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <GripDots />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm">{title}</div>
        {!hideSample && (
          <div className="mt-1 w-fit max-w-full truncate rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs">
            {String(sample ?? "—")}
          </div>
        )}
      </div>
    </div>
  );
}

function renderDragPreview<Target extends string>(
  draggingCol: string,
  byColumn: Record<string, Target>,
  unassigned: Target,
  sample: Record<string, unknown>,
) {
  const isInPool = (byColumn[draggingCol] ?? unassigned) === unassigned;
  if (isInPool) {
    return <ColumnTileBody elevated sample={sample[draggingCol]} title={draggingCol} />;
  }
  return (
    <SlotTileBody
      className="shadow-lg ring-2 ring-primary/40"
      sample={sample[draggingCol]}
      title={draggingCol}
    />
  );
}

function SlotTileBody({
  sample,
  title,
  className,
}: {
  sample: unknown;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid cursor-grab select-none grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 rounded-md border bg-card px-2 py-3.5 shadow-xs active:cursor-grabbing",
        className,
      )}
    >
      <GripDots />
      <div className="truncate font-medium text-sm">{title}</div>
      <div className="w-fit max-w-full truncate rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs">
        {String(sample ?? "—")}
      </div>
    </div>
  );
}

function SlotTile({ sample, title }: { sample: unknown; title: string }) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({ id: title });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "grid cursor-grab select-none grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 rounded-md border bg-card px-2 py-3.5 shadow-xs active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <GripDots />
      <div className="truncate font-medium text-sm">{title}</div>
      <div className="w-fit max-w-full truncate rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs">
        {String(sample ?? "—")}
      </div>
    </div>
  );
}

function GripDots() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0 text-muted-foreground/50"
      fill="currentColor"
      viewBox="0 0 8 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="2" cy="3" r="1" />
      <circle cx="6" cy="3" r="1" />
      <circle cx="2" cy="8" r="1" />
      <circle cx="6" cy="8" r="1" />
      <circle cx="2" cy="13" r="1" />
      <circle cx="6" cy="13" r="1" />
    </svg>
  );
}
