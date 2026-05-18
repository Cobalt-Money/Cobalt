import { toast } from "sonner";

import { TickerLogo } from "./brokerage/ticker-logo";
import { InstitutionLogo } from "./logos/institution-logo";

interface AccountToastInstitution {
  institution: string;
  institutionLogo: string | null;
  institutionLogosExtra?: readonly string[] | null;
  institutionUrl: string | null;
}

const POSTED_ICON = <img alt="" className="size-4" src="/assets/vectors/posted.svg" />;

const PENDING_ICON = <img alt="" className="size-4" src="/assets/vectors/pending.svg" />;

export const cobaltToast = {
  accountDisconnected(account: AccountToastInstitution) {
    return toast("Successfully deleted account", {
      description: (
        <span className="flex items-center gap-2">
          <InstitutionLogo
            className="size-4 rounded-sm"
            institutionLogo={account.institutionLogo}
            institutionLogosExtra={account.institutionLogosExtra ?? null}
            institutionName={account.institution}
            institutionUrl={account.institutionUrl}
          />
          <span>{account.institution}</span>
        </span>
      ),
      icon: POSTED_ICON,
    });
  },

  accountsUpdated(account: AccountToastInstitution) {
    return toast("Accounts updated", {
      description: (
        <span className="flex items-center gap-2">
          <InstitutionLogo
            className="size-4 rounded-sm"
            institutionLogo={account.institutionLogo}
            institutionLogosExtra={account.institutionLogosExtra ?? null}
            institutionName={account.institution}
            institutionUrl={account.institutionUrl}
          />
          <span>{account.institution}</span>
        </span>
      ),
      icon: POSTED_ICON,
    });
  },

  /** Bulk-action success — used by toolbar / palette shared notices. */
  bulkSuccess(message: string, description?: string) {
    return toast(message, {
      description,
      icon: POSTED_ICON,
    });
  },

  /** Generic failure toast — use when a mutation rejects. */
  error(message: string) {
    return toast(message, {
      icon: PENDING_ICON,
    });
  },

  /** Manual cash/credit/loan account created (no Plaid). */
  manualAccountCreated(name: string) {
    return toast("Account added", {
      description: name,
      icon: POSTED_ICON,
    });
  },

  /** Manual brokerage position added. */
  positionAdded(ticker: string, quantity: number) {
    return toast("Position added", {
      description: (
        <span className="flex items-center gap-2">
          <TickerLogo size={16} symbol={ticker} />
          <span>
            {quantity} {ticker}
          </span>
        </span>
      ),
      icon: POSTED_ICON,
    });
  },

  /** Manual transaction created. */
  transactionAdded(name: string) {
    return toast("Transaction added", {
      description: name,
      icon: POSTED_ICON,
    });
  },

  /** Manual transaction deleted. */
  transactionDeleted() {
    return toast("Transaction deleted", {
      icon: POSTED_ICON,
    });
  },
};
