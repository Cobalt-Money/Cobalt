import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { TransactionDetailView } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { mutators, queries } from "@cobalt-web/zero";
import type { ReadonlyJSONObject } from "@rocicorp/zero";
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
import { useTransactions } from "@/hooks/use-transactions";

const transactionDetailRouteApi = getRouteApi(
  "/_auth/transactions/$transactionId"
);

export const Route = createFileRoute("/_auth/transactions/$transactionId")({
  component: TransactionDetailRoute,
  loader: ({ context }) => {
    context.zero.run(queries.transactions.list());
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

  const edit = useMemo<TransactionDetailEditHandlers>(() => {
    function reportFailure(label: string) {
      return (err: unknown) => {
        console.error(`Failed to update transaction ${label}`, err);
        toast.error(`Couldn't save ${label}. Please try again.`);
      };
    }

    return {
      locationSearch: {
        loading: locationLoading,
        onQueryChange: setLocationQuery,
        results: locationResults,
      },
      onResetCategory: () => {
        void zero
          .mutate(mutators.transaction.resetCategory({ id: transactionId }))
          .server.catch(reportFailure("category"));
      },
      onResetDate: () => {
        void zero
          .mutate(mutators.transaction.resetDate({ id: transactionId }))
          .server.catch(reportFailure("date"));
      },
      onResetLocation: () => {
        void zero
          .mutate(mutators.transaction.resetLocation({ id: transactionId }))
          .server.catch(reportFailure("location"));
      },
      onResetNotes: () => {
        void zero
          .mutate(mutators.transaction.resetNotes({ id: transactionId }))
          .server.catch(reportFailure("notes"));
      },
      onUpdateCategory: (category) => {
        void zero
          .mutate(
            mutators.transaction.updateCategory({
              category,
              id: transactionId,
            })
          )
          .server.catch(reportFailure("category"));
      },
      onUpdateDate: (date) => {
        void zero
          .mutate(mutators.transaction.updateDate({ date, id: transactionId }))
          .server.catch(reportFailure("date"));
      },
      onUpdateLocation: (location) => {
        void zero
          .mutate(
            mutators.transaction.updateLocation({ id: transactionId, location })
          )
          .server.catch(reportFailure("location"));
      },
      onUpdateName: (name) => {
        void zero
          .mutate(mutators.transaction.updateName({ id: transactionId, name }))
          .server.catch(reportFailure("name"));
      },
      onUpdateNotes: (notes) => {
        void zero
          .mutate(
            mutators.transaction.updateNotes({
              id: transactionId,
              // Tiptap's typed JSON doc is structurally a JSON object; Zero's
              // column type requires `ReadonlyJSONObject` (index-signatured).
              notes: notes as ReadonlyJSONObject,
            })
          )
          .server.catch(reportFailure("notes"));
      },
    };
  }, [transactionId, zero, locationLoading, locationResults]);

  return (
    <SidebarShellLayout flushBottom>
      <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col">
        {transaction ? (
          <TransactionDetailView edit={edit} transaction={transaction} />
        ) : (
          <div className="mx-auto flex min-h-48 w-full max-w-2xl items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        )}
      </div>
    </SidebarShellLayout>
  );
}
