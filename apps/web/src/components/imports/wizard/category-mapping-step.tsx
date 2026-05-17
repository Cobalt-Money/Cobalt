import type {
  CategorySuggestionsResponse,
  ConfirmCategoryMappingBody,
} from "@cobalt-web/server-data/import/shared/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { CategoryPicker } from "@cobalt-web/ui/cobalt/transactions/detail/category-picker";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { CategoryPickerOption } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import { Button } from "@cobalt-web/ui/components/button";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { importsApi } from "@/lib/clients/api-client";

type CategoryChoiceState = { action: "link"; targetCategoryId: string } | { action: "skip" };

export function CategoryMappingStep({ jobId }: { jobId: string }) {
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["category-map"].$get({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Failed to load category suggestions");
      }
      return await res.json();
    },
    queryKey: ["import-job", jobId, "category-map"],
  });

  if (suggestQuery.isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (suggestQuery.isError) {
    return <p className="text-destructive text-sm">{(suggestQuery.error as Error).message}</p>;
  }

  return <CategoryMappingStepInner data={suggestQuery.data} jobId={jobId} />;
}

/**
 * One source-category row. User picks an existing Cobalt category or skips
 * (imports as uncategorized). Creating new categories is not supported during
 * import — users add categories from settings post-import.
 */
function CategoryMappingRow({
  label,
  choice,
  categoryOptions,
  onSetChoice,
}: {
  label: string;
  choice: CategoryChoiceState | undefined;
  categoryOptions: readonly CategoryPickerOption[];
  onSetChoice: (label: string, choice: CategoryChoiceState) => void;
}) {
  const linked =
    choice?.action === "link"
      ? categoryOptions.find((c) => c.id === choice.targetCategoryId)
      : undefined;

  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <div className="flex-1 font-medium text-sm">{label}</div>

      <div className="flex flex-1 items-center">
        <CategoryPicker
          onSelect={(opt) => onSetChoice(label, { action: "link", targetCategoryId: opt.id })}
          options={categoryOptions}
          selectedKey={choice?.action === "link" ? choice.targetCategoryId || null : null}
          trigger={
            <Button className="w-full justify-start gap-2 rounded-md" variant="outline">
              {linked ? (
                <>
                  <CategoryIcon
                    icon={resolveCategoryIcon(linked.iconKey) ?? UNKNOWN_CATEGORY_ICON}
                    sizeClassName="size-4"
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{linked.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Pick a category…</span>
              )}
            </Button>
          }
        />
      </div>
    </div>
  );
}

function seedChoicesFromSuggestions(
  suggestions: CategorySuggestionsResponse["suggestions"],
  userCategories: CategorySuggestionsResponse["userCategories"],
): Record<string, CategoryChoiceState> {
  // Skip suggestions route to the user's "uncategorized" system category so
  // every label resolves to an existing category. Users can't opt out of
  // importing rows from the wizard; skip → uncategorized.
  const uncategorizedId = userCategories.find((c) => c.systemKey === "uncategorized")?.id ?? null;
  const seed: Record<string, CategoryChoiceState> = {};
  for (const s of suggestions) {
    if (s.action === "link" && s.targetCategoryId) {
      seed[s.sourceLabel] = { action: "link", targetCategoryId: s.targetCategoryId };
    } else if (uncategorizedId) {
      seed[s.sourceLabel] = { action: "link", targetCategoryId: uncategorizedId };
    } else {
      seed[s.sourceLabel] = { action: "skip" };
    }
  }
  return seed;
}

function CategoryMappingStepInner({
  data,
  jobId,
}: {
  data: CategorySuggestionsResponse;
  jobId: string;
}) {
  const qc = useQueryClient();
  const [choices, setChoices] = useState<Record<string, CategoryChoiceState>>(() =>
    seedChoicesFromSuggestions(data.suggestions, data.userCategories),
  );

  const confirmMut = useMutation({
    mutationFn: async (body: ConfirmCategoryMappingBody) => {
      const res = await importsApi[":id"]["category-map"].$post({
        json: body,
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to confirm category mapping");
      }
      return await res.json();
    },
    onError: (e) => cobaltToast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });

  const labels = data.sourceLabels;
  const { userCategories, userGroups } = data;
  const groupById = new Map(userGroups.map((g) => [g.id, g] as const));
  const categoryOptions: CategoryPickerOption[] = userCategories.map((c) => {
    const group = groupById.get(c.groupId);
    const groupSystemKey = group?.systemKey ?? null;
    return {
      groupName: group?.name ?? "Other",
      groupSystemKey,
      iconKey: c.iconKey,
      id: c.id,
      name: c.name,
      sectionKey: deriveCategorySection(groupSystemKey),
    };
  });

  const setChoice = (label: string, choice: CategoryChoiceState) =>
    setChoices((p) => ({ ...p, [label]: choice }));

  // Skip / unmapped labels fall through to "uncategorized". Only in-progress
  // link rows can block Continue.
  const allResolved = labels.every((l) => {
    const c = choices[l];
    if (c?.action === "link") {
      return c.targetCategoryId.length > 0;
    }
    return true;
  });

  const onSubmit = () => {
    confirmMut.mutate({ map: choices });
  };

  if (labels.length === 0) {
    confirmMut.mutate({ map: {} });
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        {labels.map((label) => (
          <CategoryMappingRow
            categoryOptions={categoryOptions}
            choice={choices[label]}
            key={label}
            label={label}
            onSetChoice={setChoice}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <Button disabled={!allResolved || confirmMut.isPending} onClick={onSubmit}>
          {confirmMut.isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
