import type { CashAccountFormValues } from "@cobalt-web/ui/cobalt/accounts/add-cash-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import { useCallback } from "react";

/** Fire-and-forget create cash account; errors surface via toast. */
export function useAddCashAccountSubmit() {
  const zero = useZero();

  const submit = useCallback(
    (values: CashAccountFormValues): Promise<void> => {
      const { server } = zero.mutate(
        mutators.accounts.createAccount({
          name: values.name,
          subtype: "cash",
          type: "depository",
        })
      );
      cobaltToast.manualAccountCreated(values.name);
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(
              result.error.message || "Couldn't create account."
            );
          }
        } catch (error) {
          console.error("Failed to create cash account", error);
          cobaltToast.error("Couldn't create account. Please try again.");
        }
      })();
      return Promise.resolve();
    },
    [zero]
  );

  return { submit };
}
