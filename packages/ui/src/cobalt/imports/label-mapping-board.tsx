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

/**
 * Generic source-label → bucket DnD board.
 *
 * Buckets:
 *   - existing: one bucket per existing target (account/category). id = `existing:<id>`.
 *   - create:   single bucket; caller renders inline config per assigned label.
 *   - skip:     single bucket; assignments mean "drop these rows".
 *
 * Caller owns the choice state and renders inline configuration UI.
 */

const CREATE_BUCKET = "__create__";
const SKIP_BUCKET = "__skip__";
const EXISTING_PREFIX = "existing:";

export type LabelChoiceKind = "existing" | "create" | "skip";

export interface LabelExistingTarget {
  id: string;
  /** Primary text for the bucket header. */
  label: string;
  /** Secondary text (institution, system flag, etc). */
  sublabel?: string;
}

export interface LabelMappingBoardProps {
  sourceLabels: readonly string[];
  existing: readonly LabelExistingTarget[];
  /** label → choice. */
  choiceFor: (
    sourceLabel: string,
  ) => { kind: "existing"; existingId: string } | { kind: "create" } | { kind: "skip" } | undefined;
  /** Called when a label is dropped on an existing-target bucket. */
  onAssignExisting: (sourceLabel: string, existingId: string) => void;
  onAssignCreate: (sourceLabel: string) => void;
  onAssignSkip: (sourceLabel: string) => void;
  /** Optional inline config for a label assigned to "create new". */
  renderCreateConfig?: (sourceLabel: string) => React.ReactNode;
  /** Optional AI suggestion text rendered next to source-label tile. */
  suggestionFor?: (sourceLabel: string) => string | undefined;
  existingHeader?: string;
  createHeader?: string;
  skipHeader?: string;
}

export function LabelMappingBoard({
  sourceLabels,
  existing,
  choiceFor,
  onAssignExisting,
  onAssignCreate,
  onAssignSkip,
  renderCreateConfig,
  suggestionFor,
  existingHeader = "Existing",
  createHeader = "Create new",
  skipHeader = "Skip",
}: LabelMappingBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null);

  const handleDragStart = (e: DragStartEvent) => setDraggingLabel(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingLabel(null);
    if (!e.over) {
      return;
    }
    const label = String(e.active.id);
    const overId = String(e.over.id);
    if (overId === CREATE_BUCKET) {
      onAssignCreate(label);
    } else if (overId === SKIP_BUCKET) {
      onAssignSkip(label);
    } else if (overId.startsWith(EXISTING_PREFIX)) {
      onAssignExisting(label, overId.slice(EXISTING_PREFIX.length));
    }
  };

  const labelsAssignedTo = (
    predicate: (c: ReturnType<LabelMappingBoardProps["choiceFor"]>) => boolean,
  ) => sourceLabels.filter((l) => predicate(choiceFor(l)));

  const unassigned = labelsAssignedTo((c) => c === undefined);
  const createAssigned = labelsAssignedTo((c) => c?.kind === "create");
  const skipAssigned = labelsAssignedTo((c) => c?.kind === "skip");
  const labelsForExisting = (id: string) =>
    sourceLabels.filter((l) => {
      const c = choiceFor(l);
      return c?.kind === "existing" && c.existingId === id;
    });

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragCancel={() => setDraggingLabel(null)}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <PoolColumn>
          <SectionHeader>Source labels</SectionHeader>
          <div className="flex flex-col gap-2">
            {unassigned.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-center text-muted-foreground text-xs">
                All labels assigned. Drag from a bucket to reset.
              </div>
            )}
            {unassigned.map((l) => (
              <LabelTile
                dragging={draggingLabel === l}
                key={l}
                label={l}
                suggestion={suggestionFor?.(l)}
              />
            ))}
          </div>
        </PoolColumn>

        <div className="flex flex-col gap-3">
          <div>
            <SectionHeader>{existingHeader}</SectionHeader>
            <div className="flex flex-col gap-2">
              {existing.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-center text-muted-foreground text-xs">
                  No existing options.
                </div>
              )}
              {existing.map((ex) => (
                <ExistingBucket
                  assigned={labelsForExisting(ex.id)}
                  bucket={ex}
                  draggingLabel={draggingLabel}
                  key={ex.id}
                  suggestionFor={suggestionFor}
                />
              ))}
            </div>
          </div>

          <SimpleBucket
            bucketId={CREATE_BUCKET}
            draggingLabel={draggingLabel}
            header={createHeader}
            renderItem={renderCreateConfig ? (l: string) => renderCreateConfig(l) : undefined}
            sourceLabels={createAssigned}
            suggestionFor={suggestionFor}
          />

          <SimpleBucket
            bucketId={SKIP_BUCKET}
            draggingLabel={draggingLabel}
            header={skipHeader}
            sourceLabels={skipAssigned}
            suggestionFor={suggestionFor}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingLabel ? (
          <LabelTile elevated label={draggingLabel} suggestion={suggestionFor?.(draggingLabel)} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PoolColumn({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border bg-muted/30 p-3">{children}</div>;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </div>
  );
}

function ExistingBucket({
  assigned,
  bucket,
  draggingLabel,
  suggestionFor,
}: {
  assigned: string[];
  bucket: LabelExistingTarget;
  draggingLabel: string | null;
  suggestionFor?: (l: string) => string | undefined;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `${EXISTING_PREFIX}${bucket.id}` });
  return (
    <div
      className={cn(
        "rounded-md border p-2 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
        draggingLabel && !isOver && "border-dashed",
      )}
      ref={setNodeRef}
    >
      <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
        <div className="font-medium text-sm">{bucket.label}</div>
        {bucket.sublabel && <div className="text-muted-foreground text-xs">{bucket.sublabel}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 ? (
          <div className="px-1 text-muted-foreground text-xs italic">drop here</div>
        ) : (
          assigned.map((l) => (
            <LabelTile compact key={l} label={l} suggestion={suggestionFor?.(l)} />
          ))
        )}
      </div>
    </div>
  );
}

function SimpleBucket({
  bucketId,
  draggingLabel,
  header,
  renderItem,
  sourceLabels,
  suggestionFor,
}: {
  bucketId: string;
  draggingLabel: string | null;
  header: string;
  renderItem?: (l: string) => React.ReactNode;
  sourceLabels: string[];
  suggestionFor?: (l: string) => string | undefined;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: bucketId });
  return (
    <div>
      <SectionHeader>{header}</SectionHeader>
      <div
        className={cn(
          "rounded-md border p-3 transition-colors",
          isOver && "border-primary/60 bg-primary/5",
          draggingLabel && !isOver && "border-dashed",
        )}
        ref={setNodeRef}
      >
        {sourceLabels.length === 0 ? (
          <div className="text-muted-foreground text-xs italic">drop here</div>
        ) : (
          <div className="flex flex-col gap-2">
            {sourceLabels.map((l) => (
              <div className="flex flex-col gap-2" key={l}>
                <LabelTile compact label={l} suggestion={suggestionFor?.(l)} />
                {renderItem?.(l)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LabelTile({
  compact,
  dragging,
  elevated,
  label,
  suggestion,
}: {
  compact?: boolean;
  dragging?: boolean;
  elevated?: boolean;
  label: string;
  suggestion?: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: label });
  const style = transform
    ? { transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)` }
    : undefined;
  return (
    <div
      className={cn(
        "cursor-grab select-none rounded-md border bg-card px-3 py-2 shadow-xs active:cursor-grabbing",
        compact && "py-1",
        dragging && "opacity-40",
        elevated && "shadow-lg ring-2 ring-primary/40",
      )}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="font-medium text-sm">{label}</div>
      {suggestion && !compact && <div className="text-muted-foreground text-xs">{suggestion}</div>}
    </div>
  );
}
