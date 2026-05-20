import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { useCallback } from "react";
import { useMutator } from "./use-mutator";

interface BulkSetCategoryArgs {
  transactionIds: string[];
  categoryId: string;
}

interface BulkSetExcludedArgs {
  transactionIds: string[];
  excluded: boolean;
}

export function useBulkSetCategory() {
  const run = useMutator();
  const mutateAsync = useCallback(
    async (args: BulkSetCategoryArgs) => {
      const handle = run(
        (m) =>
          m.transaction.bulkSetCategory({
            categoryId: args.categoryId,
            editIds: args.transactionIds.map(() => crypto.randomUUID()),
            transactionIds: args.transactionIds,
          }),
        { silent: true },
      );
      const result = await handle.server;
      if (result.type === "error") {
        cobaltToast.error(result.error.message || "Couldn't update categories.");
        throw new Error(result.error.message);
      }
    },
    [run],
  );
  return { mutateAsync };
}

export function useBulkSetExcluded() {
  const run = useMutator();
  const mutateAsync = useCallback(
    async (args: BulkSetExcludedArgs) => {
      const handle = run(
        (m) =>
          m.transaction.bulkSetExcluded({
            excluded: args.excluded,
            transactionIds: args.transactionIds,
          }),
        { silent: true },
      );
      const result = await handle.server;
      if (result.type === "error") {
        cobaltToast.error(result.error.message || "Couldn't update transactions.");
        throw new Error(result.error.message);
      }
    },
    [run],
  );
  return { mutateAsync };
}
