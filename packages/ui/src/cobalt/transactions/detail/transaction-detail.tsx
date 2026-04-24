import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Separator } from "@cobalt-web/ui/components/separator";

import { TransactionDetailActivity } from "./transaction-detail-activity";
import type { TransactionDetailEditHandlers } from "./transaction-detail-summary";
import { TransactionDetailSummary } from "./transaction-detail-summary";
import { TransactionNotes } from "./transaction-notes";

export type { TransactionDetailEditHandlers } from "./transaction-detail-summary";

export function TransactionDetailView({
  edit,
  transaction,
}: {
  edit?: TransactionDetailEditHandlers;
  transaction: TransactionListItem;
}) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8 pt-[10vh] pb-8">
      <TransactionDetailSummary edit={edit} transaction={transaction} />
      {edit ? (
        <TransactionNotes
          notes={transaction.notes ?? null}
          onReset={edit.onResetNotes}
          onUpdate={edit.onUpdateNotes}
        />
      ) : null}
      <Separator />
      <TransactionDetailActivity transaction={transaction} />
    </div>
  );
}
