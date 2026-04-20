import type { BankOption } from "@cobalt-web/ui/cobalt/transactions/transactions-toolbar";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

/**
 * Distinct banks (institutions) the signed-in user has connected, sourced from
 * the already-preloaded `bankAccounts` query and deduped by FK.
 *
 * The id is `bank_connection.institution_id` (Plaid institution id), NOT
 * `institution.id` (a UUID), because the transaction Bank filter joins on the
 * connection FK.
 */
export function useBankOptions(): BankOption[] {
  const [rows] = useQuery(queries.accounts.bankAccounts());
  return useMemo(() => {
    const byId = new Map<string, BankOption>();
    for (const row of rows as readonly {
      connection?: {
        institutionId?: string | null;
        institution?: {
          logo?: string | null;
          name?: string | null;
          url?: string | null;
        } | null;
      } | null;
    }[]) {
      const id = row.connection?.institutionId;
      if (!id || byId.has(id)) {
        continue;
      }
      const institution = row.connection?.institution;
      byId.set(id, {
        id,
        logo: institution?.logo ?? null,
        name: institution?.name ?? "Unknown",
        url: institution?.url ?? null,
      });
    }
    return [...byId.values()].toSorted((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
}
