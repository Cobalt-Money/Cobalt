import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import { useCallback } from "react";

interface BulkSetCategoryArgs {
  transactionIds: string[];
  categoryId: string;
}

interface BulkSetExcludedArgs {
  transactionIds: string[];
  excluded: boolean;
}

export function useBulkSetCategory() {
  const zero = useZero();
  const mutateAsync = useCallback(
    async (args: BulkSetCategoryArgs) => {
      const { server } = zero.mutate(
        mutators.transaction.bulkSetCategory({
          categoryId: args.categoryId,
          editIds: args.transactionIds.map(() => crypto.randomUUID()),
          transactionIds: args.transactionIds,
        }),
      );
      const result = await server;
      if (result.type === "error") {
        cobaltToast.error(result.error.message || "Couldn't update categories.");
        throw new Error(result.error.message);
      }
    },
    [zero],
  );
  return { mutateAsync };
}

export function useBulkSetExcluded() {
  const zero = useZero();
  const mutateAsync = useCallback(
    async (args: BulkSetExcludedArgs) => {
      const { server } = zero.mutate(
        mutators.transaction.bulkSetExcluded({
          excluded: args.excluded,
          transactionIds: args.transactionIds,
        }),
      );
      const result = await server;
      if (result.type === "error") {
        cobaltToast.error(result.error.message || "Couldn't update transactions.");
        throw new Error(result.error.message);
      }
    },
    [zero],
  );
  return { mutateAsync };
}
