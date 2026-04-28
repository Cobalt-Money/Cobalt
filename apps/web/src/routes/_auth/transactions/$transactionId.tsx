import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { TransactionDetailView } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { mutators, queries } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useGeocodeSearch } from "@/hooks/use-geocode-search";
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

  const editEvents = useHistory(transactionId);

  const edit = useMemo<TransactionDetailEditHandlers>(() => {
    const id = transactionId;

    const onError = (label: string) => (err: unknown) => {
      console.error(`Failed to update transaction ${label}`, err);
      toast.error(`Couldn't save ${label}. Please try again.`);
    };

    return {
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
            mutators.transaction.resetNotes({ editId: crypto.randomUUID(), id })
          )
          .server.catch(onError("notes"));
      },
      onUpdateCategory: (category) => {
        void zero
          .mutate(
            mutators.transaction.updateCategory({
              editId: crypto.randomUUID(),
              id,
              category,
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
    };
  }, [transactionId, zero, locationLoading, locationResults]);

  return (
    <SidebarShellLayout flushBottom>
      <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col">
        {transaction ? (
          <TransactionDetailView
            edit={edit}
            editEvents={editEvents}
            transaction={transaction}
          />
        ) : (
          <div className="mx-auto flex min-h-48 w-full max-w-2xl items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        )}
      </div>
    </SidebarShellLayout>
  );
}
