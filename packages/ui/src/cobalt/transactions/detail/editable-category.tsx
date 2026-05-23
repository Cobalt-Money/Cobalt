import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "../categories";
import { CategoryPicker } from "./category-picker";

export type CategorySectionKey = "income" | "spending" | "transfer";

export function deriveCategorySection(groupSystemKey: string | null): CategorySectionKey {
  if (groupSystemKey === "income") {
    return "income";
  }
  if (groupSystemKey === "transfers") {
    return "transfer";
  }
  return "spending";
}

export interface CategoryPickerOption {
  id: string;
  name: string;
  iconKey: string;
  groupName: string;
  groupSystemKey: string | null;
  sectionKey: CategorySectionKey;
}

interface EditableCategoryProps {
  category: TransactionResponse["category"];
  isOverridden: boolean;
  onReset: () => void;
  onSubmit: (value: { categoryId: string }) => void;
  /** All non-deleted, non-hidden cats for the user. Caller fetches via `queries.categories.list`. */
  options: readonly CategoryPickerOption[];
  /** Optional: when provided, picker shows "+ New category" row that fires this. */
  onCreateCategory?: () => void;
}

export function EditableCategory({
  category,
  isOverridden,
  onReset,
  onSubmit,
  options,
  onCreateCategory,
}: EditableCategoryProps) {
  const icon = category
    ? (resolveCategoryIcon(category.iconKey) ?? UNKNOWN_CATEGORY_ICON)
    : UNKNOWN_CATEGORY_ICON;
  const groupLabel = category?.groupName ?? null;

  return (
    <div className="flex min-w-0 items-center gap-1 text-base leading-6">
      <CategoryPicker
        onCreateCategory={onCreateCategory}
        onSelect={(item) => onSubmit({ categoryId: item.id })}
        options={options}
        selectedKey={category?.id ?? null}
        trigger={
          <button
            aria-label="Edit category"
            className="-mx-2 flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted"
            type="button"
          >
            {category ? (
              <>
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <CategoryIcon icon={icon} />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-foreground">{groupLabel ?? category.name}</span>
                  {groupLabel ? (
                    <>
                      <HugeiconsIcon
                        aria-hidden
                        className="size-3 shrink-0 text-muted-foreground"
                        icon={ArrowRight01Icon}
                        strokeWidth={2}
                      />
                      <span className="min-w-0 truncate text-muted-foreground">
                        {category.name}
                      </span>
                    </>
                  ) : null}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No category</span>
            )}
            {isOverridden ? (
              <span className="rounded-full bg-background px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Edited
              </span>
            ) : null}
          </button>
        }
      />
      {isOverridden ? (
        <button
          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onReset}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Refresh01Icon} strokeWidth={2} />
          Reset
        </button>
      ) : null}
    </div>
  );
}
