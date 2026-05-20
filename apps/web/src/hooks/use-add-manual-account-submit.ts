import type { ManualAccountFormValues } from "@cobalt-web/ui/cobalt/accounts/add-manual-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { useCallback } from "react";
import { accountsApi } from "../lib/clients/api-client";
import { useMutator } from "./use-mutator";

export function useAddManualAccountSubmit() {
  const run = useMutator();

  const submit = useCallback(
    async (values: ManualAccountFormValues): Promise<void> => {
      const handle = run(
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
      // Seed today's snapshot row for manual accounts after the Zero mutation
      // commits server-side. Plaid/SnapTrade get this via their workflow
      // hooks; Zero mutators can't reach the snapshot upsert directly. Cron
      // would catch this at 22:00 UTC anyway — this just avoids the gap so
      // net-worth chart shows the new account immediately.
      const result = await handle.server;
      if (result.type !== "error") {
        try {
          await accountsApi.manual["seed-snapshot"].$post();
        } catch {
          // Best-effort — cron will backfill tonight.
        }
      }
    },
    [run],
  );

  return { submit };
}
