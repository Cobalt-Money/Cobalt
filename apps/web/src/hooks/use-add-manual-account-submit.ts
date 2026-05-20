import type { ManualAccountFormValues } from "@cobalt-web/ui/cobalt/accounts/add-manual-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { useCallback } from "react";
import { useMutator } from "./use-mutator";

export function useAddManualAccountSubmit() {
  const run = useMutator();

  const submit = useCallback(
    (values: ManualAccountFormValues): Promise<void> => {
      run(
        (m) =>
          m.accounts.createAccount({
            creditLimit: values.creditLimit ?? undefined,
            currency: values.currency,
            currentBalance: values.currentBalance,
            logoDomain: values.logoDomain ?? undefined,
            name: values.name,
            subtype: values.subtype,
            type: values.type,
          }),
        "Couldn't create account.",
      );
      cobaltToast.manualAccountCreated(values.name);
      return Promise.resolve();
    },
    [run],
  );

  return { submit };
}
