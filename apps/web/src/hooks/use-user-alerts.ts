import type {
  BankAccountRowWithRelations,
  BrokerageRowWithRelations,
} from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { formatAlert } from "@cobalt-web/server-data/alerts/formatter";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

/**
 * Mirror of the `user_alerts` Zero table columns. Hand-declared because
 * drizzle-zero emits `customType: null as unknown as CustomType<...>`
 * placeholders that don't flow concrete column types through Zero's
 * `Row<>` generic. Same pattern as `use-tags.ts`, `use-transactions.ts`.
 */
interface AlertRowFromZero {
  id: string;
  userId: string;
  type: string;
  source: string;
  sourceId: string | null;
  metadata: unknown;
  createdAt: number;
  resolvedAt: number | null;
}

export interface UserAlertRow extends AlertRowFromZero {
  title: string;
  message: string;
}

/**
 * Live-synced list of active alerts for the current user. Rows drop out
 * once `resolvedAt` is set by the reconnect / webhook flow.
 *
 * `title` and `message` are derived via `formatAlert` using the live
 * institution name from the user's already-synced bank/brokerage accounts —
 * not from frozen `metadata.institutionName`. That way a one-time bad write
 * (or a renamed institution) can't permanently corrupt the rendered copy.
 */
export function useUserAlerts() {
  const [rawAlerts, result] = useQuery(queries.alerts.active());
  const [rawBank] = useQuery(queries.accounts.bankAccounts());
  const [rawBrokerage] = useQuery(queries.accounts.brokerageAccounts());

  const alertRows = rawAlerts as unknown as readonly AlertRowFromZero[];
  const bankRows = rawBank as unknown as readonly BankAccountRowWithRelations[];
  const brokerageRows = rawBrokerage as unknown as readonly BrokerageRowWithRelations[];

  const plaidNameByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of bankRows) {
      const conn = row.plaidConnection;
      if (conn?.plaidItemId && conn.institutionName) {
        map.set(conn.plaidItemId, conn.institutionName);
      }
    }
    return map;
  }, [bankRows]);

  const snaptradeNameByAuthId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of brokerageRows) {
      const authId = row.snaptradeAuthorization?.authorizationId;
      if (authId && row.institutionName) {
        map.set(authId, row.institutionName);
      }
    }
    return map;
  }, [brokerageRows]);

  const alerts = useMemo<readonly UserAlertRow[]>(
    () =>
      alertRows.map((row) => {
        let institutionName: string | null = null;
        if (row.source === "plaid" && row.sourceId) {
          institutionName = plaidNameByItemId.get(row.sourceId) ?? null;
        } else if (row.source === "snaptrade" && row.sourceId) {
          institutionName = snaptradeNameByAuthId.get(row.sourceId) ?? null;
        }
        const { title, message } = formatAlert({ institutionName, type: row.type });
        return { ...row, message, title };
      }),
    [alertRows, plaidNameByItemId, snaptradeNameByAuthId],
  );

  return {
    alerts,
    isComplete: result.type === "complete",
  };
}
