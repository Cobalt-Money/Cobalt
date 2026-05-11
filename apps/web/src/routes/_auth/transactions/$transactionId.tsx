import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { TransactionDetailView } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { mutators, queries } from "@cobalt-web/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { useCommandMenu } from "@/components/shell/command-menu";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useCategoryGroups } from "@/hooks/use-categories";
import { useGeocodeSearch } from "@/hooks/use-geocode-search";
import { useMerchantSearch } from "@/hooks/use-merchant-search";
import {
  useSetTransactionTags,
  useTagOptions,
  useTags,
  useTransactionTagIds,
} from "@/hooks/use-tags";
import { useHistory, useTransactions } from "@/hooks/use-transactions";

const transactionDetailRouteApi = getRouteApi(
  "/_auth/transactions/$transactionId"
);

export const Route = createFileRoute("/_auth/transactions/$transactionId")({
  component: TransactionDetailRoute,
  loader: ({ context, params }) => {
    context.zero.run(queries.transactions.list());
    context.zero.run(
      queries.transactions.activity({ transactionId: params.transactionId })
    );
    context.zero.run(queries.tags.list());
    context.zero.run(
      queries.tags.forTransaction({ transactionId: params.transactionId })
    );
    context.zero.run(queries.categories.list());
  },
  staticData: { title: "Transaction" },
});

function TransactionDetailRoute() {
  const { transactionId } = transactionDetailRouteApi.useParams();
  const navigate = useNavigate();
  const zero = useZero();
  const { isComplete, items } = useTransactions();

  const transaction = useMemo(
    () => items.find((t) => t.id === transactionId),
    [items, transactionId]
  );

  useEffect(() => {
    if (isComplete && !transaction) {
      navigate({ replace: true, to: "/transactions" });
    }
  }, [isComplete, navigate, transaction]);

  const [locationQuery, setLocationQuery] = useState("");
  const { data: locationResults = [], isFetching: locationLoading } =
    useGeocodeSearch(locationQuery);
  const [merchantQuery, setMerchantQuery] = useState("");
  const { data: merchantResults = [], isFetching: merchantLoading } =
    useMerchantSearch(merchantQuery);

  const editEvents = useHistory(transactionId);

  const { options: availableTags } = useTagOptions();
  const { data: allTags = [] } = useTags();
  const [categoryRows] = useQuery(queries.categories.list());
  const categoryOptions = useMemo(
    () =>
      (categoryRows ?? []).map((cat) => {
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
    [categoryRows]
  );
  const { openAddTag } = useCommandMenu();
  const { data: categoryGroups } = useCategoryGroups();
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

    const onError = (label: string) => (err: unknown) => {
      console.error(`Failed to update transaction ${label}`, err);
      cobaltToast.error(`Couldn't save ${label}. Please try again.`);
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
        setTransactionTags.mutate(
          { tagIds, transactionId: id },
          {
            onError: onError("tags"),
          }
        );
      },
      tagIds: currentTagIds,
      locationSearch: {
        loading: locationLoading,
        onQueryChange: setLocationQuery,
        results: locationResults,
      },
      onResetCategory: () => {
        void zero
          .mutate(
            mutators.transaction.resetCategory({
              editId: crypto.randomUUID(),
              id,
            })
          )
          .server.catch(onError("category"));
      },
      onResetDate: () => {
        void zero
          .mutate(
            mutators.transaction.resetDate({ editId: crypto.randomUUID(), id })
          )
          .server.catch(onError("date"));
      },
      onResetLocation: () => {
        void zero
          .mutate(
            mutators.transaction.resetLocation({
              editId: crypto.randomUUID(),
              id,
            })
          )
          .server.catch(onError("location"));
      },
      onResetNotes: () => {
        void zero
          .mutate(
            mutators.transaction.resetNotes({
              editId: crypto.randomUUID(),
              id,
            })
          )
          .server.catch(onError("notes"));
      },
      onUpdateCategory: ({ categoryId }) => {
        void zero
          .mutate(
            mutators.transaction.updateCategory({
              categoryId,
              editId: crypto.randomUUID(),
              id,
            })
          )
          .server.catch(onError("category"));
      },
      onUpdateDate: (date) => {
        void zero
          .mutate(
            mutators.transaction.updateDate({
              editId: crypto.randomUUID(),
              id,
              date,
            })
          )
          .server.catch(onError("date"));
      },
      onUpdateLocation: (location) => {
        void zero
          .mutate(
            mutators.transaction.updateLocation({
              editId: crypto.randomUUID(),
              id,
              location,
            })
          )
          .server.catch(onError("location"));
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
        void zero
          .mutate(
            mutators.transaction.updateMerchant({
              editId: crypto.randomUUID(),
              id,
              merchantName,
              website,
            })
          )
          .server.catch(onError("merchant"));
      },
      onUpdateName: (name) => {
        void zero
          .mutate(
            mutators.transaction.updateName({
              editId: crypto.randomUUID(),
              id,
              name,
            })
          )
          .server.catch(onError("name"));
      },
      onUpdateNotes: (notes) => {
        void zero
          .mutate(
            mutators.transaction.updateNotes({
              editId: crypto.randomUUID(),
              id,
              notes,
            })
          )
          .server.catch(onError("notes"));
      },
      onDelete:
        transaction?.source === "manual"
          ? () => {
              // Fire-and-forget: navigate immediately; server runs in
              // background. See `.agents/skills/cobalt/mutations/SKILL.md`.
              const { server } = zero.mutate(
                mutators.transaction.deleteTransaction({ id })
              );
              cobaltToast.transactionDeleted();
              navigate({ replace: true, to: "/transactions" });
              void server.catch(onError("deletion"));
            }
          : undefined,
    };
  }, [
    transactionId,
    zero,
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
