import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { TransactionDetailView } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
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
    const fb = (label: string) => `Couldn't save ${label}. Please try again.`;

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
        setTransactionTags.mutate(
          { tagIds, transactionId: id },
          { onError: () => cobaltToast.error(fb("tags")) },
        );
      },
      tagIds: currentTagIds,
      locationSearch: {
        loading: locationLoading,
        onQueryChange: setLocationQuery,
        results: locationResults,
      },
      onResetCategory: () => {
        run(
          (m) =>
            m.transaction.resetCategory({ editId: crypto.randomUUID(), id }),
          fb("category"),
        );
      },
      onResetDate: () => {
        run(
          (m) => m.transaction.resetDate({ editId: crypto.randomUUID(), id }),
          fb("date"),
        );
      },
      onResetLocation: () => {
        run(
          (m) =>
            m.transaction.resetLocation({ editId: crypto.randomUUID(), id }),
          fb("location"),
        );
      },
      onResetNotes: () => {
        run(
          (m) => m.transaction.resetNotes({ editId: crypto.randomUUID(), id }),
          fb("notes"),
        );
      },
      onUpdateCategory: ({ categoryId }) => {
        run(
          (m) =>
            m.transaction.updateCategory({
              categoryId,
              editId: crypto.randomUUID(),
              id,
            }),
          fb("category"),
        );
      },
      onUpdateDate: (date) => {
        run(
          (m) =>
            m.transaction.updateDate({ editId: crypto.randomUUID(), id, date }),
          fb("date"),
        );
      },
      onUpdateLocation: (location) => {
        run(
          (m) =>
            m.transaction.updateLocation({
              editId: crypto.randomUUID(),
              id,
              location,
            }),
          fb("location"),
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
        run(
          (m) =>
            m.transaction.updateMerchant({
              editId: crypto.randomUUID(),
              id,
              merchantName,
              website,
            }),
          fb("merchant"),
        );
      },
      onUpdateName: (name) => {
        run(
          (m) =>
            m.transaction.updateName({ editId: crypto.randomUUID(), id, name }),
          fb("name"),
        );
      },
      onUpdateNotes: (notes) => {
        run(
          (m) =>
            m.transaction.updateNotes({
              editId: crypto.randomUUID(),
              id,
              notes,
            }),
          fb("notes"),
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
    navigate,
    availableTags,
    categoryOptions,
    openAddTag,
    setTransactionTags,
    currentTagIds,
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
