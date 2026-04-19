import type { TransactionDetailEditHandlers } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { TransactionDetailView } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail";
import { mutators, queries } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useTransactions } from "@/hooks/use-transactions";

const transactionDetailRouteApi = getRouteApi(
  "/_auth/transactions/$transactionId"
);

export const Route = createFileRoute("/_auth/transactions/$transactionId")({
  component: TransactionDetailRoute,
  loader: ({ context }) => {
    context.zero.run(queries.transactions.all());
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

  const edit = useMemo<TransactionDetailEditHandlers>(() => {
    function reportFailure(label: string) {
      return (err: unknown) => {
        console.error(`Failed to update transaction ${label}`, err);
        toast.error(`Couldn't save ${label}. Please try again.`);
      };
    }

    return {
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
      onUpdateName: (name) => {
        void zero
          .mutate(mutators.transaction.updateName({ id: transactionId, name }))
          .server.catch(reportFailure("name"));
      },
    };
  }, [transactionId, zero]);

  if (!transaction) {
    return (
      <div className="mx-auto flex min-h-48 w-full max-w-2xl items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <TransactionDetailView edit={edit} transaction={transaction} />;
}
