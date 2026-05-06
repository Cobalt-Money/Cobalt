import type { ManualAccountFormValues } from "@cobalt-web/ui/cobalt/accounts/add-manual-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import { useCallback } from "react";

/** Fire-and-forget create manual account; errors surface via toast. */
export function useAddManualAccountSubmit() {
  const zero = useZero();

  const submit = useCallback(
    (values: ManualAccountFormValues): Promise<void> => {
      const { server } = zero.mutate(
        mutators.accounts.createAccount({
          creditLimit: values.creditLimit ?? undefined,
          currency: values.currency,
          currentBalance: values.currentBalance,
          logoDomain: values.logoDomain ?? undefined,
          name: values.name,
          subtype: values.subtype,
          type: values.type,
        }),
      );
      cobaltToast.manualAccountCreated(values.name);
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(result.error.message || "Couldn't create account.");
          }
        } catch (error) {
          console.error("Failed to create manual account", error);
          cobaltToast.error("Couldn't create account. Please try again.");
        }
      })();
      return Promise.resolve();
    },
    [zero],
  );

  return { submit };
}
