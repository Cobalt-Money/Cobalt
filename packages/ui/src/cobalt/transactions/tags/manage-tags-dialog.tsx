"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@cobalt-web/ui/components/alert-dialog";
import { AddRowButton } from "@cobalt-web/ui/components/add-row-button";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cobalt-web/ui/components/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Add01Icon, Delete02Icon, Tag01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

import { CobaltDialog } from "../../cobalt-dialog";
import type { TagColor } from "./palette";
import { TAG_COLOR_HEX, TAG_COLORS } from "./palette";

export interface ManageTagsDialogTag {
  id: string;
  name: string;
  color: TagColor;
  /** Number of transactions this tag is applied to. */
  count: number;
}

export interface ManageTagsFormProps {
  tags: readonly ManageTagsDialogTag[];
  onRename: (tagId: string, name: string) => void;
  onRecolor: (tagId: string, color: TagColor) => void;
  onDelete: (tagId: string) => void;
  /** Show the inline "New tag" row when provided. */
  onRequestCreate?: () => void;
}

/** Body of the manage-tags screen. Used standalone in dialog or as command-palette sub-page. */
export function ManageTagsForm({
  onDelete,
  onRecolor,
  onRename,
  onRequestCreate,
  tags,
}: ManageTagsFormProps) {
  if (tags.length === 0) {
    return (
      <Empty className="bg-transparent p-6">
        <EmptyHeader>
          <EmptyMedia>
            <HugeiconsIcon
              className="size-8 text-muted-foreground"
              icon={Tag01Icon}
              strokeWidth={2}
            />
          </EmptyMedia>
          <EmptyTitle>No tags yet</EmptyTitle>
          <EmptyDescription>Create your first tag to start labeling transactions.</EmptyDescription>
        </EmptyHeader>
        {onRequestCreate ? (
          <EmptyContent>
            <Button onClick={() => onRequestCreate()} size="sm" type="button">
              <HugeiconsIcon className="size-4" icon={Add01Icon} />
              New tag
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="-mx-2 flex max-h-[60vh] flex-col overflow-y-auto">
      {onRequestCreate ? <AddRowButton label="New tag" onClick={() => onRequestCreate()} /> : null}
      <ul className="flex flex-col">
        {tags.map((t) => (
          <ManageTagsRow
            color={t.color}
            count={t.count}
            id={t.id}
            key={t.id}
            name={t.name}
            onDelete={onDelete}
            onRecolor={onRecolor}
            onRename={onRename}
          />
        ))}
      </ul>
    </div>
  );
}

export interface ManageTagsDialogProps extends ManageTagsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageTagsDialog({
  onDelete,
  onOpenChange,
  onRecolor,
  onRename,
  onRequestCreate,
  open,
  tags,
}: ManageTagsDialogProps) {
  return (
    <CobaltDialog
      className="w-[480px] sm:max-w-md"
      onOpenChange={onOpenChange}
      open={open}
      title="Manage tags"
      titleIcon={Tag01Icon}
      titleIconClassName="size-5"
    >
      <ManageTagsForm
        onDelete={onDelete}
        onRecolor={onRecolor}
        onRename={onRename}
        onRequestCreate={onRequestCreate}
        tags={tags}
      />
    </CobaltDialog>
  );
}

interface ManageTagsRowProps {
  id: string;
  name: string;
  color: TagColor;
  count: number;
  onRename: (tagId: string, name: string) => void;
  onRecolor: (tagId: string, color: TagColor) => void;
  onDelete: (tagId: string) => void;
}

function ManageTagsRow({
  color,
  count,
  id,
  name,
  onDelete,
  onRecolor,
  onRename,
}: ManageTagsRowProps) {
  const [draft, setDraft] = useState(name);
  const [colorOpen, setColorOpen] = useState(false);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  const commitName = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed.length > 50 || trimmed === name) {
      setDraft(name);
      return;
    }
    onRename(id, trimmed);
  };

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-muted/40">
      <Popover onOpenChange={setColorOpen} open={colorOpen}>
        <PopoverTrigger
          render={
            <button
              aria-label="Change tag color"
              className="size-6 shrink-0 rounded-full ring-1 ring-black/10 transition hover:scale-110 dark:ring-white/10"
              style={{ backgroundColor: TAG_COLOR_HEX[color] }}
              type="button"
            />
          }
        />
        <PopoverContent align="start" className="w-fit p-2">
          <div className="grid grid-cols-8 gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                aria-label={c}
                aria-pressed={c === color}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full transition hover:scale-110",
                  c === color && "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
                )}
                key={c}
                onClick={() => {
                  if (c !== color) {
                    onRecolor(id, c);
                  }
                  setColorOpen(false);
                }}
                style={{ backgroundColor: TAG_COLOR_HEX[c] }}
                type="button"
              >
                {c === color ? (
                  <HugeiconsIcon className="size-3.5 text-white drop-shadow" icon={Tick02Icon} />
                ) : null}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <input
        aria-label="Tag name"
        className="min-w-0 flex-1 cursor-text bg-transparent font-medium text-foreground text-sm leading-none outline-none placeholder:text-muted-foreground/50"
        maxLength={50}
        onBlur={commitName}
        onChange={(e) => setDraft(e.target.value)}
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

      <span
        className="shrink-0 text-muted-foreground/70 text-xs tabular-nums"
        title={`${count} ${count === 1 ? "transaction" : "transactions"}`}
      >
        {count}
      </span>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <button
              aria-label={`Delete tag ${name}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/0 transition hover:bg-red-500/10 hover:text-red-600 group-hover:text-muted-foreground focus-visible:text-muted-foreground dark:hover:text-red-500"
              type="button"
            >
              <HugeiconsIcon className="size-4" icon={Delete02Icon} />
            </button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag &ldquo;{name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tag from every transaction it&apos;s applied to. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              onClick={() => onDelete(id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
