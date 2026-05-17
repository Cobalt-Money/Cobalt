import type {
  ManualAccountFormPosition,
  ManualAccountFormValues,
} from "@cobalt-web/ui/cobalt/accounts/add-manual-account-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import { useCallback } from "react";

import { brokerageApi } from "@/lib/clients/api-client";

async function postHolding(
  accountId: string,
  currency: string,
  p: ManualAccountFormPosition,
): Promise<void> {
  try {
    const res = await brokerageApi["manual-holdings"].$post({
      json: {
        accountId,
        costBasis: p.costBasis ?? undefined,
        currency,
        institutionPrice: p.institutionPrice,
        institutionPriceAsOf: p.dateAcquired ?? undefined,
        name: p.name ?? undefined,
        quantity: p.quantity,
        ticker: p.ticker,
      },
    });
    if (!res.ok) {
      cobaltToast.error(`Couldn't save ${p.ticker}.`);
    }
  } catch (error) {
    console.error("Failed to post manual holding", p.ticker, error);
    cobaltToast.error(`Couldn't save ${p.ticker}.`);
  }
}

async function setCashSleeve(accountId: string, amount: number): Promise<void> {
  try {
    const res = await brokerageApi["manual-cash-sleeve"].$put({
      json: { accountId, amount },
    });
    if (!res.ok) {
      cobaltToast.error("Couldn't save uninvested cash.");
    }
  } catch (error) {
    console.error("Failed to set manual cash sleeve", error);
    cobaltToast.error("Couldn't save uninvested cash.");
  }
}

/**
 * Await the Zero `createAccount` server promise and surface failures as toasts.
 * Returns true when the account is durably committed, false otherwise — caller
 * uses this to decide whether to proceed with dependent holding POSTs.
 */
async function awaitAccountCreate(server: Promise<{ type: string; error?: { message?: string } }>) {
  try {
    const result = await server;
    if (result.type === "error") {
      cobaltToast.error(result.error?.message || "Couldn't create account.");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to create manual account", error);
    cobaltToast.error("Couldn't create account. Please try again.");
    return false;
  }
}

/**
 * Create manual account + (optional) seed holdings + cash sleeve.
 *
 * For investment accounts that include a `positions` payload, this fires Zero
 * `createAccount` with a client-generated `accountId` so we can POST holdings
 * against the new account as soon as the server confirms the create. Without
 * positions / cashSleeve, this stays a fire-and-forget Zero mutation.
 */
export function useAddManualAccountSubmit() {
  const zero = useZero();

  const submit = useCallback(
    async (values: ManualAccountFormValues): Promise<void> => {
      const positions = values.positions ?? [];
      const cash = values.cashSleeve ?? 0;
      const needsHoldings = values.type === "investment" && (positions.length > 0 || cash > 0);
      const accountId = needsHoldings ? crypto.randomUUID() : undefined;

      const { server } = zero.mutate(
        mutators.accounts.createAccount({
          accountId,
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

      if (!(needsHoldings && accountId)) {
        void awaitAccountCreate(server as Promise<{ type: string; error?: { message?: string } }>);
        return;
      }
      const ok = await awaitAccountCreate(
        server as Promise<{ type: string; error?: { message?: string } }>,
      );
      if (!ok) {
        return;
      }

      // Sequential posts — parallel can rate-limit FMP on the price-fetch
      // path, and sequential makes partial failures easier to surface.
      for (const p of positions) {
        await postHolding(accountId, values.currency, p);
      }
      if (cash > 0) {
        await setCashSleeve(accountId, cash);
      }
    },
    [zero],
  );

  return { submit };
}
