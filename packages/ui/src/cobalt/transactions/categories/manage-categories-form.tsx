"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { CollisionDetection, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Add01Icon,
  Delete02Icon,
  EyeIcon,
  Folder01Icon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AddRowButton } from "../../../components/add-row-button";
import { Button } from "../../../components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../../components/resizable";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../../../components/empty";
import { cn } from "../../../lib/utils";
import { CategoryIcon } from "./category-icon";
import { UNKNOWN_CATEGORY_ICON } from "./category-primary-icons";
import { resolveCategoryIcon, resolveGroupIcon } from "./category-system-icons";

export interface ManageCategoriesGroup {
  id: string;
  name: string;
  systemKey: string | null;
  order: number;
}

export interface ManageCategoriesCat {
  id: string;
  name: string;
  iconKey: string;
  groupId: string;
  hidden: boolean;
  order: number;
  systemKey: string | null;
  excludeFromInsights: boolean;
}

export interface ManageCategoriesFormProps {
  groups: readonly ManageCategoriesGroup[];
  catsByGroup: ReadonlyMap<string, readonly ManageCategoriesCat[]>;
  onCreateGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (group: ManageCategoriesGroup) => void;
  onCreateCategory: (groupId?: string) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onDeleteCategory: (cat: ManageCategoriesCat) => void;
  onToggleHidden: (cat: ManageCategoriesCat, hidden: boolean) => void;
  onReorderGroups: (groupIds: string[]) => void;
  onReorderCategories: (groupId: string, categoryIds: string[]) => void;
  onMoveCategoryToGroup: (categoryId: string, groupId: string) => void;
}

type RailKey = string; // "hidden" | groupId

const HIDDEN_KEY: RailKey = "hidden";

interface DragData {
  type: "group" | "cat";
  groupId?: string;
}

interface ActiveDrag {
  id: string;
  type: "group" | "cat";
  groupId?: string;
}

export function ManageCategoriesForm(props: ManageCategoriesFormProps) {
  const { groups, catsByGroup, onCreateGroup } = props;
  const [active, setActive] = useState<RailKey>(() => groups[0]?.id ?? HIDDEN_KEY);
  const [dragging, setDragging] = useState<ActiveDrag | null>(null);

  // If groups arrive after initial mount, jump to the first group (once).
  const didInitActive = useRef(groups.length > 0);
  useEffect(() => {
    const [first] = groups;
    if (!didInitActive.current && first) {
      didInitActive.current = true;
      setActive(first.id);
    }
  }, [groups]);

  const allCats = useMemo<readonly ManageCategoriesCat[]>(() => {
    const out: ManageCategoriesCat[] = [];
    for (const arr of catsByGroup.values()) {
      out.push(...arr);
    }
    return out;
  }, [catsByGroup]);

  const hiddenCount = useMemo(() => allCats.filter((c) => c.hidden).length, [allCats]);

  const visibleCats = useMemo<readonly ManageCategoriesCat[]>(() => {
    if (active === HIDDEN_KEY) {
      return allCats.filter((c) => c.hidden);
    }
    return catsByGroup.get(active) ?? [];
  }, [active, allCats, catsByGroup]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Pointer-first collision: cursor wins over rect overlap, falling back to
  // rect intersection (e.g. when overlay extends past the cursor) and finally
  // closest-center for offscreen edges. Lets a cat dragged from the detail
  // pane onto a rail group row resolve to that group cleanly.
  const detectCollisions: CollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) {
      return pointer;
    }
    const rects = rectIntersection(args);
    if (rects.length > 0) {
      return rects;
    }
    return closestCenter(args);
  };

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData | undefined;
    if (!data) {
      return;
    }
    setDragging({
      groupId: data.groupId,
      id: e.active.id as string,
      type: data.type,
    });
  };

  const handleDragCancel = () => setDragging(null);

  const handleGroupDrop = (activeId: string, overId: string) => {
    const ids = groups.map((g) => g.id);
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1) {
      return;
    }
    props.onReorderGroups(arrayMove(ids, from, to));
  };

  const handleCatDrop = (
    activeId: string,
    fromGroupId: string,
    overId: string,
    oData: DragData | undefined,
  ) => {
    if (oData?.type === "group") {
      if (overId !== fromGroupId) {
        props.onMoveCategoryToGroup(activeId, overId);
      }
      return;
    }
    if (oData?.type !== "cat" || !oData.groupId) {
      return;
    }
    if (oData.groupId !== fromGroupId) {
      props.onMoveCategoryToGroup(activeId, oData.groupId);
      return;
    }
    const ids = (catsByGroup.get(fromGroupId) ?? []).map((c) => c.id);
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1) {
      return;
    }
    props.onReorderCategories(fromGroupId, arrayMove(ids, from, to));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { active: a, over } = e;
    if (!over || a.id === over.id) {
      return;
    }
    const aData = a.data.current as DragData | undefined;
    const oData = over.data.current as DragData | undefined;
    if (!aData) {
      return;
    }
    if (aData.type === "group" && oData?.type === "group") {
      handleGroupDrop(a.id as string, over.id as string);
      return;
    }
    if (aData.type === "cat" && aData.groupId) {
      handleCatDrop(a.id as string, aData.groupId, over.id as string, oData);
    }
  };

  if (groups.length === 0) {
    return (
      <Empty className="bg-transparent p-6">
        <EmptyHeader>
          <EmptyMedia>
            <HugeiconsIcon
              className="size-8 text-muted-foreground"
              icon={Folder01Icon}
              strokeWidth={2}
            />
          </EmptyMedia>
          <EmptyTitle>No groups yet</EmptyTitle>
          <EmptyDescription>Create a group to start organizing categories.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreateGroup} size="sm" type="button">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            New group
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // Reorder cats only when viewing a single (real) group.
  const reorderableGroupId = active === HIDDEN_KEY ? null : (active as string);
  const detailSortableIds = reorderableGroupId ? visibleCats.map((c) => c.id) : [];

  const overlayGroup =
    dragging?.type === "group" ? (groups.find((g) => g.id === dragging.id) ?? null) : null;
  const overlayCat =
    dragging?.type === "cat" ? (allCats.find((c) => c.id === dragging.id) ?? null) : null;

  return (
    <DndContext
      collisionDetection={detectCollisions}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <ResizablePanelGroup
        className="min-h-[70vh]"
        id="manage-categories-rail"
        orientation="horizontal"
      >
        <ResizablePanel defaultSize="30%" maxSize="40%" minSize="15%">
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <GroupRail
              active={active}
              catsByGroup={catsByGroup}
              draggingCat={dragging?.type === "cat"}
              groups={groups}
              hiddenCount={hiddenCount}
              onCreateGroup={onCreateGroup}
              onDeleteGroup={props.onDeleteGroup}
              onRenameGroup={props.onRenameGroup}
              onSelect={setActive}
            />
          </SortableContext>
        </ResizablePanel>
        <ResizableHandle className="mx-3 cursor-col-resize bg-border/60 hover:bg-border" />
        <ResizablePanel defaultSize="70%" minSize="50%">
          <SortableContext items={detailSortableIds} strategy={verticalListSortingStrategy}>
            <DetailPane
              active={active}
              cats={visibleCats}
              groups={groups}
              onCreateCategory={props.onCreateCategory}
              onDeleteCategory={props.onDeleteCategory}
              onRenameCategory={props.onRenameCategory}
              onRenameGroup={props.onRenameGroup}
              onToggleHidden={props.onToggleHidden}
              sortable={reorderableGroupId !== null}
            />
          </SortableContext>
        </ResizablePanel>
      </ResizablePanelGroup>
      <DragOverlay dropAnimation={null}>
        {overlayGroup ? (
          <RailGroupRowDisplay
            active={false}
            count={(catsByGroup.get(overlayGroup.id) ?? []).length}
            elevated
            group={overlayGroup}
            isSystem={overlayGroup.systemKey !== null}
          />
        ) : null}
        {overlayCat ? <CategoryItemDisplay cat={overlayCat} elevated /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Rail ──────────────────────────────────────────────────────────────────────

function GroupRail({
  active,
  groups,
  catsByGroup,
  hiddenCount,
  draggingCat,
  onSelect,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: {
  active: RailKey;
  groups: readonly ManageCategoriesGroup[];
  catsByGroup: ReadonlyMap<string, readonly ManageCategoriesCat[]>;
  hiddenCount: number;
  draggingCat: boolean;
  onSelect: (key: RailKey) => void;
  onCreateGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (group: ManageCategoriesGroup) => void;
}) {
  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto pr-2">
      <AddRowButton
        className="gap-2 bg-input/30 px-3 hover:bg-input/50"
        label="Create group"
        onClick={onCreateGroup}
      />
      <RailItem
        active={active === HIDDEN_KEY}
        count={hiddenCount}
        icon={
          <HugeiconsIcon
            className="size-6 shrink-0 text-muted-foreground"
            icon={ViewOffIcon}
            strokeWidth={2}
          />
        }
        label="Hidden"
        onSelect={() => onSelect(HIDDEN_KEY)}
      />
      <div className="my-2 h-px bg-border/60" />
      {groups.map((g) => {
        const count = (catsByGroup.get(g.id) ?? []).length;
        const isSystem = g.systemKey !== null;
        return (
          <SortableRailGroupRow
            active={active === g.id}
            count={count}
            draggingCat={draggingCat}
            group={g}
            isSystem={isSystem}
            key={g.id}
            onDelete={() => onDeleteGroup(g)}
            onRename={(next) => onRenameGroup(g.id, next)}
            onSelect={() => onSelect(g.id)}
          />
        );
      })}
    </aside>
  );
}

function RailItem({
  active,
  label,
  count,
  icon,
  onSelect,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: ReactNode | null;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-left text-base transition",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
      onClick={onSelect}
      type="button"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-muted-foreground/60 text-sm tabular-nums">{count}</span>
      <span className="size-7 shrink-0" />
    </button>
  );
}

function SortableRailGroupRow({
  active,
  group,
  count,
  isSystem,
  draggingCat,
  onSelect,
  onRename,
  onDelete,
}: {
  active: boolean;
  group: ManageCategoriesGroup;
  count: number;
  isSystem: boolean;
  draggingCat: boolean;
  onSelect: () => void;
  onRename: (next: string) => void;
  onDelete: () => void;
}) {
  const sortable = useSortable({
    data: { type: "group" } satisfies DragData,
    id: group.id,
  });
  const isCatDropTarget = draggingCat && sortable.isOver;
  const style = {
    opacity: sortable.isDragging ? 0 : 1,
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div ref={sortable.setNodeRef} style={style}>
      <RailGroupRowDisplay
        active={active}
        count={count}
        dropTarget={isCatDropTarget}
        dragHandle={
          <DragHandle
            attributes={sortable.attributes}
            label={`Drag to reorder ${group.name}`}
            listeners={sortable.listeners}
          />
        }
        group={group}
        isSystem={isSystem}
        onDelete={onDelete}
        onRename={onRename}
        onSelect={onSelect}
      />
    </div>
  );
}

function RailGroupRowDisplay({
  active,
  group,
  count,
  isSystem,
  dropTarget = false,
  elevated = false,
  dragHandle,
  onSelect,
  onRename,
  onDelete,
}: {
  active: boolean;
  group: ManageCategoriesGroup;
  count: number;
  isSystem: boolean;
  dropTarget?: boolean;
  elevated?: boolean;
  dragHandle?: React.ReactNode;
  onSelect?: () => void;
  onRename?: (next: string) => void;
  onDelete?: () => void;
}) {
  const groupIcon = resolveGroupIcon(group.systemKey);
  return (
    <div
      className={cn(
        "group/rail flex items-center gap-2 rounded-md px-3 py-2 text-base transition",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/40",
        dropTarget && "bg-primary/10 ring-1 ring-primary/40",
        elevated && "bg-popover text-foreground shadow-lg ring-1 ring-border",
      )}
    >
      <button
        aria-label={`Open ${group.name}`}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={onSelect}
        type="button"
      >
        {groupIcon ? (
          <CategoryIcon icon={groupIcon} sizeClassName="size-6" />
        ) : (
          <span className="size-6 shrink-0" />
        )}
        {onRename ? (
          <InlineEditableName
            ariaLabel="Group name"
            className={cn("text-base", active && "text-foreground")}
            name={group.name}
            onCommit={onRename}
            onFocus={onSelect}
          />
        ) : (
          <span className="min-w-0 truncate">{group.name}</span>
        )}
      </button>
      <span className="shrink-0 text-muted-foreground/60 text-sm tabular-nums">{count}</span>
      {!isSystem && onDelete ? (
        <RowIconButton
          ariaLabel={`Delete group ${group.name}`}
          danger
          icon={Delete02Icon}
          onClick={onDelete}
        />
      ) : null}
      {dragHandle ?? <span className="size-7 shrink-0" />}
    </div>
  );
}

// ── Detail pane ───────────────────────────────────────────────────────────────

function DetailPane({
  active,
  groups,
  cats,
  sortable,
  onCreateCategory,
  onRenameCategory,
  onRenameGroup,
  onDeleteCategory,
  onToggleHidden,
}: {
  active: RailKey;
  groups: readonly ManageCategoriesGroup[];
  cats: readonly ManageCategoriesCat[];
  sortable: boolean;
  onCreateCategory: (groupId?: string) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteCategory: (cat: ManageCategoriesCat) => void;
  onToggleHidden: (cat: ManageCategoriesCat, hidden: boolean) => void;
}) {
  const isPseudo = active === HIDDEN_KEY;
  const activeGroup = isPseudo ? null : (groups.find((g) => g.id === active) ?? null);
  const headingLabel = isPseudo ? "Hidden" : (activeGroup?.name ?? "");

  return (
    <div className="flex h-full min-w-0 flex-col gap-2 overflow-y-auto pl-2">
      <div className="flex items-center gap-2">
        {activeGroup ? (
          <InlineEditableName
            ariaLabel="Group name"
            className="font-semibold text-2xl text-foreground tracking-tight"
            name={activeGroup.name}
            onCommit={(next) => onRenameGroup(activeGroup.id, next)}
          />
        ) : (
          <h2 className="min-w-0 truncate font-semibold text-2xl text-foreground tracking-tight">
            {headingLabel}
          </h2>
        )}
        <div className="ml-auto">
          <Button
            className="shrink-0"
            onClick={() => onCreateCategory(activeGroup?.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            + New category
          </Button>
        </div>
      </div>

      {cats.length === 0 ? (
        <p className="px-2 py-8 text-center text-base text-muted-foreground">
          {active === HIDDEN_KEY ? "No hidden categories." : "No categories here yet."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {cats.map((c) => (
            <SortableCategoryItem
              cat={c}
              draggable={sortable || isPseudo}
              groupName={isPseudo ? (groups.find((g) => g.id === c.groupId)?.name ?? "") : ""}
              key={c.id}
              onDelete={() => onDeleteCategory(c)}
              onRename={(next) => onRenameCategory(c.id, next)}
              onToggleHidden={(hidden) => onToggleHidden(c, hidden)}
              showGroupBadge={isPseudo}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SortableCategoryItem({
  cat,
  draggable,
  onRename,
  onDelete,
  onToggleHidden,
  showGroupBadge,
  groupName,
}: {
  cat: ManageCategoriesCat;
  draggable: boolean;
  onRename: (next: string) => void;
  onDelete: () => void;
  onToggleHidden: (hidden: boolean) => void;
  showGroupBadge: boolean;
  groupName: string;
}) {
  const sortable = useSortable({
    data: { groupId: cat.groupId, type: "cat" } satisfies DragData,
    disabled: !draggable,
    id: cat.id,
  });
  const style = {
    opacity: sortable.isDragging ? 0 : 1,
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <li ref={sortable.setNodeRef} style={style}>
      <CategoryItemDisplay
        cat={cat}
        dragHandle={
          draggable ? (
            <DragHandle
              attributes={sortable.attributes}
              label={`Drag to move ${cat.name}`}
              listeners={sortable.listeners}
            />
          ) : (
            <span className="size-7 shrink-0" />
          )
        }
        groupName={groupName}
        onDelete={onDelete}
        onRename={onRename}
        onToggleHidden={onToggleHidden}
        showGroupBadge={showGroupBadge}
      />
    </li>
  );
}

function CategoryItemDisplay({
  cat,
  dragHandle,
  dropTarget = false,
  elevated = false,
  onRename,
  onDelete,
  onToggleHidden,
  showGroupBadge = false,
  groupName = "",
}: {
  cat: ManageCategoriesCat;
  dragHandle?: React.ReactNode;
  dropTarget?: boolean;
  elevated?: boolean;
  onRename?: (next: string) => void;
  onDelete?: () => void;
  onToggleHidden?: (hidden: boolean) => void;
  showGroupBadge?: boolean;
  groupName?: string;
}) {
  const icon = resolveCategoryIcon(cat.iconKey) ?? UNKNOWN_CATEGORY_ICON;
  const isSystem = cat.systemKey !== null;

  return (
    <div
      className={cn(
        "group/rail flex items-center gap-2 rounded-md py-2 pr-3 text-base text-muted-foreground transition hover:bg-muted/40",
        cat.hidden && "opacity-50",
        dropTarget && "bg-primary/10 ring-1 ring-primary/40",
        elevated && "bg-popover text-foreground shadow-lg ring-1 ring-border",
      )}
    >
      {dragHandle ?? <span className="size-7 shrink-0" />}
      <CategoryIcon icon={icon} sizeClassName="size-6" />
      {onRename ? (
        <InlineEditableName
          ariaLabel="Category name"
          className="text-base text-foreground"
          name={cat.name}
          onCommit={onRename}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-foreground">{cat.name}</span>
      )}
      {showGroupBadge && groupName ? (
        <span className="shrink-0 rounded bg-muted/60 px-2 py-0.5 text-muted-foreground text-xs">
          {groupName}
        </span>
      ) : null}
      {onToggleHidden ? (
        <RowIconButton
          ariaLabel={cat.hidden ? `Show ${cat.name}` : `Hide ${cat.name}`}
          icon={cat.hidden ? ViewOffIcon : EyeIcon}
          onClick={() => onToggleHidden(!cat.hidden)}
        />
      ) : null}
      {!isSystem && onDelete ? (
        <RowIconButton
          ariaLabel={`Delete ${cat.name}`}
          danger
          icon={Delete02Icon}
          onClick={onDelete}
        />
      ) : null}
    </div>
  );
}

function InlineEditableName({
  name,
  onCommit,
  className,
  ariaLabel,
  readOnly = false,
  onFocus,
}: {
  name: string;
  onCommit: (next: string) => void;
  className?: string;
  ariaLabel: string;
  readOnly?: boolean;
  onFocus?: () => void;
}) {
  const [draft, setDraft] = useState(name);
  useEffect(() => {
    setDraft(name);
  }, [name]);

  if (readOnly) {
    return <span className={cn("min-w-0 truncate", className)}>{name}</span>;
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed.length > 50 || trimmed === name) {
      setDraft(name);
      return;
    }
    onCommit(trimmed);
  };

  return (
    <input
      aria-label={ariaLabel}
      className={cn(
        "min-w-0 flex-1 cursor-text bg-transparent leading-none outline-none placeholder:text-muted-foreground/50",
        className,
      )}
      maxLength={50}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
      value={draft}
    />
  );
}

function RowIconButton({
  icon,
  onClick,
  ariaLabel,
  danger = false,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  onClick: () => void;
  ariaLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
        danger && "hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-500",
      )}
      onClick={onClick}
      type="button"
    >
      <HugeiconsIcon className="size-4" icon={icon} />
    </button>
  );
}

function DragHandle({
  attributes,
  listeners,
  label,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/50 transition hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
      type="button"
      {...attributes}
      {...listeners}
    >
      <svg
        aria-hidden="true"
        className="size-4"
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
    </button>
  );
}
