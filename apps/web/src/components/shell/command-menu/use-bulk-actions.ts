import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type { ExportFormat } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import {
  buildTransactionsTsv,
  exportTransactions,
} from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { useCallback } from "react";

import { useBulkSetCategory, useBulkSetExcluded } from "@/hooks/use-bulk-transactions";
import { useBulkApplyTags } from "@/hooks/use-tags";

interface UseBulkActionsArgs {
  targets: readonly TransactionResponse[];
  /** Called after every successful (or failed-then-toasted) bulk action — typically closes palette + clears selection. */
  onDone: () => void;
}

/**
 * Bundles every "operate on N selected transactions" action exposed by the
 * command palette. All handlers no-op when `targets` is empty, always call
 * `onDone` in `finally`, and surface failures via `cobaltToast`.
 */
export function useBulkActions({ targets, onDone }: UseBulkActionsArgs) {
  const { mutateAsync: bulkSetCategory } = useBulkSetCategory();
  const { mutateAsync: bulkSetExcluded } = useBulkSetExcluded();
  const { mutateAsync: bulkApplyTags } = useBulkApplyTags();

  const setCategory = useCallback(
    (categoryId: string) => {
      const ids = targets.map((t) => t.id);
      if (ids.length === 0) {
        return;
      }
      void (async () => {
        try {
          await bulkSetCategory({ categoryId, transactionIds: ids });
        } catch {
          // toast already shown
        } finally {
          onDone();
        }
      })();
    },
    [bulkSetCategory, onDone, targets],
  );

  const applyTag = useCallback(
    (tagId: string, mode: "add" | "remove") => {
      const ids = targets.map((t) => t.id);
      if (ids.length === 0) {
        return;
      }
      void (async () => {
        try {
          await bulkApplyTags({
            addTagIds: mode === "add" ? [tagId] : [],
            removeTagIds: mode === "remove" ? [tagId] : [],
            transactionIds: ids,
          });
        } catch {
          // toast already shown
        } finally {
          onDone();
        }
      })();
    },
    [bulkApplyTags, onDone, targets],
  );

  const exportFormat = useCallback(
    (format: ExportFormat) => {
      if (targets.length === 0) {
        return;
      }
      exportTransactions([...targets], format);
      onDone();
    },
    [onDone, targets],
  );

  const copy = useCallback(() => {
    if (targets.length === 0) {
      return;
    }
    const tsv = buildTransactionsTsv([...targets]);
    void (async () => {
      try {
        await navigator.clipboard.writeText(tsv);
        cobaltToast.bulkSuccess(
          `Copied ${targets.length} ${targets.length === 1 ? "row" : "rows"}`,
          "Paste into a spreadsheet to keep columns.",
        );
      } catch {
        cobaltToast.error("Couldn't copy to clipboard.");
      } finally {
        onDone();
      }
    })();
  }, [onDone, targets]);

  const setExcluded = useCallback(
    (excluded: boolean) => {
      const ids = targets.map((t) => t.id);
      if (ids.length === 0) {
        return;
      }
      void (async () => {
        try {
          await bulkSetExcluded({ excluded, transactionIds: ids });
        } catch {
          // toast already shown
        } finally {
          onDone();
        }
      })();
    },
    [bulkSetExcluded, onDone, targets],
  );

  return { applyTag, copy, exportFormat, setCategory, setExcluded };
}
