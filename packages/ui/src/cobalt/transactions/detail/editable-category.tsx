import { CATEGORY_MAPPING } from "@cobalt-web/server-data/transactions/categories";
import type { CategoryData } from "@cobalt-web/server-data/transactions/categories";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { CobaltSelectPopover } from "../../select-popover";
import {
  CategoryIcon,
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
  PRIMARY_CATEGORY_ICON,
} from "../categories";
import type { PrimaryCategoryKey } from "../categories";

const PRIMARY_KEYS = Object.keys(CATEGORY_MAPPING) as PrimaryCategoryKey[];

interface CategoryItem {
  value: PrimaryCategoryKey;
  label: string;
}

const CATEGORY_ITEMS: readonly CategoryItem[] = PRIMARY_KEYS.map((value) => ({
  label: CATEGORY_MAPPING[value].label,
  value,
}));

interface EditableCategoryProps {
  category: CategoryData | null;
  isOverridden: boolean;
  onReset: () => void;
  onSubmit: (value: { detailed: string; primary: string }) => void;
}

export function EditableCategory({
  category,
  isOverridden,
  onReset,
  onSubmit,
}: EditableCategoryProps) {
  const categoryConfig = category ? getCategoryDisplayConfig(category) : null;
  const detailedLabel = category?.detailed
    ? getDetailedCategoryDisplayName(category.detailed)
    : null;

  return (
    <div className="flex min-w-0 items-center gap-1 text-base leading-6">
      <CobaltSelectPopover
        emptyText="No categories"
        itemKey={(item: CategoryItem) => item.value}
        itemMatch={(item: CategoryItem, q) =>
          item.label.toLowerCase().includes(q)
        }
        items={CATEGORY_ITEMS}
        onSelect={(item: CategoryItem) => {
          onSubmit({ detailed: "", primary: item.value });
        }}
        renderIcon={(item: CategoryItem) => (
          <CategoryIcon icon={PRIMARY_CATEGORY_ICON[item.value]} />
        )}
        renderLabel={(item: CategoryItem) => item.label}
        searchPlaceholder="Search categories…"
        selectedKey={category?.primary ?? null}
        trigger={
          <button
            aria-label="Edit category"
            className="-mx-2 flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted"
            type="button"
          >
            {categoryConfig ? (
              <>
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <CategoryIcon icon={categoryConfig.icon} />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-foreground">
                    {categoryConfig.label}
                  </span>
                  {detailedLabel ? (
                    <>
                      <HugeiconsIcon
                        aria-hidden
                        className="size-3 shrink-0 text-muted-foreground"
                        icon={ArrowRight01Icon}
                        strokeWidth={2}
                      />
                      <span className="min-w-0 truncate text-muted-foreground">
                        {detailedLabel}
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
          <HugeiconsIcon
            className="size-3"
            icon={Refresh01Icon}
            strokeWidth={2}
          />
          Reset
        </button>
      ) : null}
    </div>
  );
}
