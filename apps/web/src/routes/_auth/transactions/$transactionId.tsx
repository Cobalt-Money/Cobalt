import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { TransactionDetailView } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import {
  isTagColor,
  TAG_COLOR_HEX,
} from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { mapZeroTransactionDetailRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";

import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { useCommandMenu } from "@/components/shell/command-menu";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useGeocodeSearch } from "@/hooks/use-geocode-search";
import { useMerchantSearch } from "@/hooks/use-merchant-search";
import { useMutator } from "@/hooks/use-mutator";
import {
  useSetTransactionTags,
  useTagOptions,
  useTransactionTagIds,
} from "@/hooks/use-tags";
import { useTransactionUndo } from "@/lib/transaction-undo";

const transactionDetailRouteApi = getRouteApi(
  "/_auth/transactions/$transactionId",
);

export const Route = createFileRoute("/_auth/transactions/$transactionId")({
  component: TransactionDetailRoute,
  loader: ({ context, params }) => {
    context.zero.preload(
      queries.transactions.detail({ transactionId: params.transactionId }),
      { ttl: "5m" },
    );
    context.zero.preload(queries.tags.list(), { ttl: "5m" });
    context.zero.preload(
      queries.tags.forTransaction({ transactionId: params.transactionId }),
      { ttl: "5m" },
    );
    context.zero.preload(queries.categories.list(), { ttl: "5m" });
  },
  staticData: { title: "Transaction" },
});

function TransactionDetailRoute() {
  const { transactionId } = transactionDetailRouteApi.useParams();
  const navigate = useNavigate();
  const run = useMutator();
  const [detailRow, detailResult] = useQuery(
    queries.transactions.detail({ transactionId }),
  );

  const mapped = useMemo(
    () => (detailRow ? mapZeroTransactionDetailRow(detailRow) : null),
    [detailRow],
  );
  const transaction = mapped?.transaction;
  const editEvents = mapped?.events ?? [];

  useEffect(() => {
    if (detailResult.type === "complete" && !transaction) {
      navigate({ replace: true, to: "/transactions" });
    }
  }, [detailResult.type, navigate, transaction]);

  const [locationQuery, setLocationQuery] = useState("");
  const { data: locationResults = [], isFetching: locationLoading } =
    useGeocodeSearch(locationQuery);
  const [merchantQuery, setMerchantQuery] = useState("");
  const { data: merchantResults = [], isFetching: merchantLoading } =
    useMerchantSearch(merchantQuery);

  const { options: availableTags } = useTagOptions();
  const [allTags] = useQuery(queries.tags.list());
  const [categoryRows] = useQuery(queries.categories.list());
  const categoryOptions = useMemo(
    () =>
      categoryRows.map((cat) => {
        const groupSystemKey = cat.group?.systemKey ?? null;
        return {
          groupName: cat.group?.name ?? "",
          groupSystemKey,
          iconKey: cat.iconKey,
          id: cat.id,
          name: cat.name,
          sectionKey: deriveCategorySection(groupSystemKey),
        };
      }),
    [categoryRows],
  );
  const { openAddTag } = useCommandMenu();
  const [categoryGroups] = useQuery(queries.categories.listGroups());
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const setTransactionTags = useSetTransactionTags();
  const { data: currentTagIds = [] } = useTransactionTagIds(transactionId);
  const { push: pushUndo } = useTransactionUndo();
  const tagsById = useMemo(() => {
    const map = new Map<string, { name: string; color: TagColor }>();
    for (const t of allTags) {
      if (isTagColor(t.color)) {
        map.set(t.id, { color: t.color, name: t.name });
      }
    }
    return map;
  }, [allTags]);

  const edit = useMemo<TransactionDetailEditHandlers>(() => {
    const id = transactionId;
    const uid = () => crypto.randomUUID();
    const fb = (label: string) => `Couldn't save ${label}. Please try again.`;
    const onErr = (label: string) => ({
      onError: () => cobaltToast.error(fb(label)),
    });
    const merchant = transaction?.name ?? "transaction";

    /** Wrap a single forward+inverse pair into a rich undoable action. */
    const undoableField = (field: string, forward: () => void, inverse: () => void, skip = false) => {
      pushUndo({
        forward,
        inverse,
        label: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-foreground/60">Updated</span>
            <strong>{field}</strong>
            <span className="text-foreground/60">on {merchant}</span>
          </span>
        ),
        skip,
      });
    };

    return {
      availableTags,
      categoryOptions,
      onCreateCategory: () => {
        setCreateCategoryOpen(true);
      },
      onRequestCreateTag: (initialName: string) => {
        openAddTag({ initialName });
      },
      onUpdateTags: (tagIds: string[]) => {
        const sortedPrior = [...new Set(currentTagIds)].toSorted();
        const sortedNext = [...new Set(tagIds)].toSorted();
        const same =
          sortedPrior.length === sortedNext.length &&
          sortedPrior.every((v, i) => v === sortedNext[i]);
        const apply = (next: string[]) =>
          setTransactionTags.mutate({ tagIds: next, transactionId: id }, onErr("tags"));
        if (same) {
          apply(tagIds);
          return;
        }
        const addedIds = sortedNext.filter((tid) => !sortedPrior.includes(tid));
        const removedIds = sortedPrior.filter((tid) => !sortedNext.includes(tid));
        const renderTagChip = (tagId: string) => {
          const tag = tagsById.get(tagId);
          if (!tag) return null;
          return (
            <span className="inline-flex items-center gap-1" key={tagId}>
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: TAG_COLOR_HEX[tag.color] }}
              />
              <span>{tag.name}</span>
            </span>
          );
        };
        const verb =
          addedIds.length > 0 && removedIds.length === 0
            ? "Added"
            : removedIds.length > 0 && addedIds.length === 0
              ? "Removed"
              : "Updated";
        const tagsShown = addedIds.length > 0 ? addedIds : removedIds;
        pushUndo({
          forward: () => apply(sortedNext),
          inverse: () => apply(sortedPrior),
          label: (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-foreground/60">{verb}</span>
              {tagsShown.map(renderTagChip)}
              {addedIds.length > 0 && removedIds.length > 0 ? (
                <>
                  <span className="text-foreground/60">·</span>
                  <span className="text-foreground/60">removed</span>
                  {removedIds.map(renderTagChip)}
                </>
              ) : null}
              <span className="text-foreground/60">
                {addedIds.length > 0 ? "to" : "from"} {merchant}
              </span>
            </span>
          ),
        });
      },
      tagIds: currentTagIds,
      locationSearch: {
        loading: locationLoading,
        onQueryChange: setLocationQuery,
        results: locationResults,
      },
      onResetCategory: () => {
        const prior = transaction?.category?.id ?? null;
        undoableField(
          "category",
          () => run((m) => m.transaction.resetCategory({ editId: uid(), id }), fb("category")),
          () => {
            if (prior) {
              run(
                (m) => m.transaction.updateCategory({ categoryId: prior, editId: uid(), id }),
                fb("category"),
              );
            } else {
              run((m) => m.transaction.resetCategory({ editId: uid(), id }), fb("category"));
            }
          },
          prior === null,
        );
      },
      onResetDate: () => {
        const prior = transaction?.date ?? null;
        undoableField(
          "date",
          () => run((m) => m.transaction.resetDate({ editId: uid(), id }), fb("date")),
          () => {
            if (prior) {
              run(
                (m) => m.transaction.updateDate({ date: prior, editId: uid(), id }),
                fb("date"),
              );
            } else {
              run((m) => m.transaction.resetDate({ editId: uid(), id }), fb("date"));
            }
          },
        );
      },
      onResetLocation: () => {
        const prior = transaction?.location ?? null;
        undoableField(
          "location",
          () => run((m) => m.transaction.resetLocation({ editId: uid(), id }), fb("location")),
          () => {
            if (prior) {
              run(
                (m) => m.transaction.updateLocation({ editId: uid(), id, location: prior }),
                fb("location"),
              );
            } else {
              run((m) => m.transaction.resetLocation({ editId: uid(), id }), fb("location"));
            }
          },
        );
      },
      onResetNotes: () => {
        const prior = transaction?.notes ?? null;
        undoableField(
          "notes",
          () => run((m) => m.transaction.resetNotes({ editId: uid(), id }), fb("notes")),
          () => {
            if (prior !== null && prior !== undefined) {
              run(
                (m) => m.transaction.updateNotes({ editId: uid(), id, notes: prior }),
                fb("notes"),
              );
            } else {
              run((m) => m.transaction.resetNotes({ editId: uid(), id }), fb("notes"));
            }
          },
          prior === null || prior === undefined,
        );
      },
      onUpdateCategory: ({ categoryId }) => {
        const prior = transaction?.category?.id ?? null;
        const nextCat = categoryOptions.find((c) => c.id === categoryId);
        const icon = nextCat?.iconKey
          ? (resolveCategoryIcon(nextCat.iconKey) ?? UNKNOWN_CATEGORY_ICON)
          : UNKNOWN_CATEGORY_ICON;
        pushUndo({
          forward: () =>
            run(
              (m) => m.transaction.updateCategory({ categoryId, editId: uid(), id }),
              fb("category"),
            ),
          inverse: () => {
            if (prior) {
              run(
                (m) => m.transaction.updateCategory({ categoryId: prior, editId: uid(), id }),
                fb("category"),
              );
            } else {
              run((m) => m.transaction.resetCategory({ editId: uid(), id }), fb("category"));
            }
          },
          label: (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-foreground/60">Set category to</span>
              <span className="inline-flex items-center gap-1">
                <CategoryIcon icon={icon} sizeClassName="size-4" />
                <strong>{nextCat?.name ?? "category"}</strong>
              </span>
              <span className="text-foreground/60">on {merchant}</span>
            </span>
          ),
          skip: categoryId === prior,
        });
      },
      onUpdateDate: (date) => {
        const prior = transaction?.date ?? null;
        undoableField(
          "date",
          () => run((m) => m.transaction.updateDate({ date, editId: uid(), id }), fb("date")),
          () => {
            if (prior) {
              run(
                (m) => m.transaction.updateDate({ date: prior, editId: uid(), id }),
                fb("date"),
              );
            } else {
              run((m) => m.transaction.resetDate({ editId: uid(), id }), fb("date"));
            }
          },
          date === prior,
        );
      },
      onUpdateLocation: (location) => {
        const prior = transaction?.location ?? null;
        undoableField(
          "location",
          () => run(
            (m) => m.transaction.updateLocation({ editId: uid(), id, location }),
            fb("location"),
          ),
          () => {
            if (prior) {
              run(
                (m) => m.transaction.updateLocation({ editId: uid(), id, location: prior }),
                fb("location"),
              );
            } else {
              run((m) => m.transaction.resetLocation({ editId: uid(), id }), fb("location"));
            }
          },
        );
      },
      merchantSearch: {
        loading: merchantLoading,
        onQueryChange: setMerchantQuery,
        results: merchantResults.map((r) => ({
          brandId: r.brandId,
          domain: r.domain,
          icon: r.icon,
          name: r.name,
        })),
      },
      onUpdateMerchant: ({ merchantName, website }) => {
        const priorMerchant = transaction?.merchantName ?? null;
        const priorWebsite = transaction?.website ?? null;
        undoableField(
          "merchant",
          () => run(
            (m) =>
              m.transaction.updateMerchant({
                editId: uid(),
                id,
                merchantName,
                website,
              }),
            fb("merchant"),
          ),
          () => run(
            (m) =>
              m.transaction.updateMerchant({
                editId: uid(),
                id,
                merchantName: priorMerchant,
                website: priorWebsite,
              }),
            fb("merchant"),
          ),
          merchantName === priorMerchant && website === priorWebsite,
        );
      },
      onUpdateName: (name) => {
        const prior = transaction?.name ?? "";
        undoableField(
          "name",
          () => run((m) => m.transaction.updateName({ editId: uid(), id, name }), fb("name")),
          () =>
            run(
              (m) => m.transaction.updateName({ editId: uid(), id, name: prior }),
              fb("name"),
            ),
          name === prior,
        );
      },
      onUpdateNotes: (notes) => {
        const prior = transaction?.notes ?? null;
        undoableField(
          "notes",
          () => run(
            (m) => m.transaction.updateNotes({ editId: uid(), id, notes }),
            fb("notes"),
          ),
          () => {
            if (prior !== null && prior !== undefined) {
              run(
                (m) => m.transaction.updateNotes({ editId: uid(), id, notes: prior }),
                fb("notes"),
              );
            } else {
              run((m) => m.transaction.resetNotes({ editId: uid(), id }), fb("notes"));
            }
          },
          notes === prior,
        );
      },
      onDelete:
        transaction?.source === "manual"
          ? () => {
              run(
                (m) => m.transaction.deleteTransaction({ id }),
                fb("deletion"),
              );
              cobaltToast.transactionDeleted();
              navigate({ replace: true, to: "/transactions" });
            }
          : undefined,
    };
  }, [
    transactionId,
    run,
    locationLoading,
    locationResults,
    merchantLoading,
    merchantResults,
    transaction?.source,
    transaction?.name,
    transaction?.notes,
    transaction?.date,
    transaction?.location,
    transaction?.category?.id,
    transaction?.merchantName,
    transaction?.website,
    navigate,
    availableTags,
    categoryOptions,
    openAddTag,
    setTransactionTags,
    currentTagIds,
    pushUndo,
    tagsById,
  ]);

  return (
    <SidebarShellLayout flushBottom>
      <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col">
        {transaction ? (
          <TransactionDetailView
            edit={edit}
            editEvents={editEvents}
            tagsById={tagsById}
            transaction={transaction}
          />
        ) : (
          <div className="mx-auto flex min-h-48 w-full max-w-2xl items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        )}
      </div>
      <CategoryFormDialog
        groups={categoryGroups}
        initial={null}
        onOpenChange={setCreateCategoryOpen}
        open={createCategoryOpen}
      />
    </SidebarShellLayout>
  );
}
