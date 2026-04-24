import {
  CATEGORY_MAPPING,
  DETAILED_CATEGORY_MAPPING,
} from "@cobalt-web/server-data/transactions/categories";
import type { CategoryData } from "@cobalt-web/server-data/transactions/categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  CategoryIcon,
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
  PRIMARY_CATEGORY_ICON,
} from "../categories";
import type { PrimaryCategoryKey } from "../categories";

const PRIMARY_KEYS = Object.keys(CATEGORY_MAPPING) as PrimaryCategoryKey[];

/** Pre-bucketed detailed keys grouped by primary, for quick lookups in the popover. */
const DETAILED_BY_PRIMARY: Record<PrimaryCategoryKey, string[]> = (() => {
  const map = {} as Record<PrimaryCategoryKey, string[]>;
  for (const primary of PRIMARY_KEYS) {
    map[primary] = Object.keys(DETAILED_CATEGORY_MAPPING).filter((detailed) =>
      detailed.startsWith(`${primary}_`)
    );
  }
  return map;
})();

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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
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
        <DropdownMenuContent className="w-64" align="start">
          {PRIMARY_KEYS.map((primary) => {
            const detaileds = DETAILED_BY_PRIMARY[primary] ?? [];
            if (detaileds.length === 0) {
              return null;
            }
            return (
              <DropdownMenuSub key={primary}>
                <DropdownMenuSubTrigger>
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <CategoryIcon icon={PRIMARY_CATEGORY_ICON[primary]} />
                  </span>
                  <span className="min-w-0 truncate">
                    {CATEGORY_MAPPING[primary].label}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  {detaileds.map((detailed) => (
                    <DropdownMenuItem
                      key={detailed}
                      onClick={() => onSubmit({ detailed, primary })}
                    >
                      <span className="truncate">
                        {getDetailedCategoryDisplayName(detailed)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
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
