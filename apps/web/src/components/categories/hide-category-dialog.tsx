import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { CategoryPicker } from "@cobalt-web/ui/cobalt/transactions/detail/category-picker";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { CategoryPickerOption } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo, useState } from "react";

import type { ManageCategoriesCat } from "@cobalt-web/ui/cobalt/transactions/categories/manage-categories-form";

import { useHideCategory } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ManageCategoriesCat | null;
}

export function HideCategoryDialog({ open, onOpenChange, category }: Props) {
  const hide = useHideCategory();
  const [allCategories] = useQuery(queries.categories.list({ includeHidden: true }));
  const { items: txns, isComplete } = useTransactions({
    categoryIds: category ? [category.id] : [],
  });

  const [userReassign, setUserReassign] = useState<string | null>(null);
  const [skipReassign, setSkipReassign] = useState(false);

  const targets = useMemo(
    () => allCategories.filter((c) => c.id !== category?.id && !c.hidden),
    [allCategories, category?.id],
  );

  const defaultReassign = useMemo(() => {
    const uncategorized = targets.find((c) => c.systemKey === "uncategorized");
    return uncategorized?.id ?? targets[0]?.id ?? "";
  }, [targets]);
  const reassignTo = userReassign ?? defaultReassign;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUserReassign(null);
      setSkipReassign(false);
    }
    onOpenChange(next);
  };

  const pickerOptions = useMemo<readonly CategoryPickerOption[]>(
    () =>
      targets.map((c) => {
        const groupSystemKey = c.group?.systemKey ?? null;
        return {
          groupName: c.group?.name ?? "",
          groupSystemKey,
          iconKey: c.iconKey,
          id: c.id,
          name: c.name,
          sectionKey: deriveCategorySection(groupSystemKey),
        };
      }),
    [targets],
  );

  const txCount = txns.length;
  const target = targets.find((t) => t.id === reassignTo) ?? null;
  const targetIcon = target ? (resolveCategoryIcon(target.iconKey) ?? null) : null;

  const handleHide = () => {
    if (!category) {
      return;
    }
    const reassign = skipReassign || txCount === 0 ? null : reassignTo || null;
    hide({ categoryId: category.id, reassignTo: reassign });
    handleOpenChange(false);
  };

  const canSubmit = category !== null && (skipReassign || txCount === 0 || reassignTo !== "");

  const renderBody = () => {
    if (!isComplete) {
      return <p className="text-muted-foreground text-sm">Counting transactions…</p>;
    }
    if (txCount === 0) {
      return (
        <div className="flex items-center gap-2 rounded-2xl bg-input/30 px-3 py-2.5 text-muted-foreground text-sm">
          <HugeiconsIcon className="size-4 shrink-0" icon={ViewIcon} strokeWidth={2} />
          No transactions assigned to this category.
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">
            Move <span className="font-medium text-foreground">{txCount}</span> transaction
            {txCount === 1 ? "" : "s"} to
          </span>
          <CategoryPicker
            onSelect={(opt) => setUserReassign(opt.id)}
            options={pickerOptions}
            selectedKey={reassignTo}
            trigger={
              <button
                aria-label="Choose destination category"
                className={cn(
                  "inline-flex h-[1.625rem] shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 bg-input/40 px-2 text-foreground text-xs transition-colors hover:bg-input/60",
                  skipReassign && "cursor-not-allowed opacity-40",
                )}
                disabled={skipReassign}
                type="button"
              >
                {target ? (
                  <>
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <CategoryIcon
                        icon={targetIcon ?? UNKNOWN_CATEGORY_ICON}
                        sizeClassName="size-4"
                      />
                    </span>
                    <span className="max-w-[12rem] truncate">{target.name}</span>
                  </>
                ) : (
                  <span>Select category</span>
                )}
                <HugeiconsIcon
                  className="size-3 shrink-0 text-muted-foreground"
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                />
              </button>
            }
          />
        </div>

        <button
          aria-pressed={skipReassign}
          className={cn(
            "inline-flex h-[1.625rem] w-fit shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
            skipReassign
              ? "border-foreground/15 bg-input/40 text-foreground"
              : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
          )}
          onClick={() => setSkipReassign((v) => !v)}
          type="button"
        >
          <HugeiconsIcon className="size-3.5 shrink-0" icon={ViewOffIcon} strokeWidth={2} />
          {skipReassign ? "Keeping transactions assigned" : "Keep transactions assigned"}
        </button>
      </div>
    );
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon className="size-4" icon={ViewOffIcon} strokeWidth={2} />
            {category ? `Hide ${category.name}` : "Hide category"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-muted-foreground text-sm leading-snug">
            Hidden categories don't appear in pickers or summaries. You can unhide it any time.
          </p>
          {renderBody()}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleHide} type="button">
            <HugeiconsIcon icon={ViewOffIcon} strokeWidth={2} />
            Hide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
