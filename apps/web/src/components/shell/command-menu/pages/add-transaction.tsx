import { Icon } from "@cobalt-web/ui/components/icon";
import { AddTransactionForm } from "@cobalt-web/ui/cobalt/transactions/add-transaction-dialog";
import { Money01Icon } from "@hugeicons/core-free-icons";
import { useCallback } from "react";

import { useAddTransactionData } from "@/hooks/use-add-transaction-data";

interface Props {
  /** Fired after a successful submit. Parent decides whether to pop or close. */
  onSuccess: () => void;
  /** Backspace on empty input pops back. */
  onBackspaceWhenEmpty: () => void;
  /** Bridge into the `add-tag` sub-page; parent owns navigation. */
  onRequestCreateTag: (initialName: string) => void;
  /** Bridge into the `add-manual-account` sub-page; parent owns navigation. */
  onCreateCashAccount: () => void;
}

export function AddTransactionPage({
  onSuccess,
  onBackspaceWhenEmpty,
  onRequestCreateTag,
  onCreateCashAccount,
}: Props) {
  const { availableTags, categoryOptions, locationSearch, manualAccounts, merchantSearch, submit } =
    useAddTransactionData();

  const handleSubmit = useCallback(
    (values: Parameters<typeof submit>[0]) => {
      void (async () => {
        try {
          await submit(values);
          onSuccess();
        } catch {
          // Toast already shown by submit hook.
        }
      })();
    },
    [onSuccess, submit],
  );

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
        <Icon className="shrink-0" icon={Money01Icon} size="lg" />
        New Transaction
      </h2>
      <AddTransactionForm
        accounts={manualAccounts}
        availableTags={availableTags}
        categoryOptions={categoryOptions}
        locationSearch={locationSearch}
        merchantSearch={merchantSearch}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onCreateCashAccount={onCreateCashAccount}
        onRequestCreateTag={onRequestCreateTag}
        onSubmit={handleSubmit}
        submitting={false}
      />
    </div>
  );
}
