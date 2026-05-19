import type { BankOption } from "@cobalt-web/ui/cobalt/transactions/transactions-toolbar";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

/**
 * Distinct banks (institutions) the signed-in user has connected, sourced from
 * the already-preloaded `bankAccounts` query and **deduped by institution
 * name** so a CSV-imported manual account and a Plaid-linked account at the
 * same bank show as a single filter row.
 *
 * The option id is `bank:<lower-cased institution name>`. The transaction
 * filter resolves it by matching `institutionName` on both
 * `plaid_connection` (for Plaid accounts) and `financial_account` (for
 * manual accounts) — see `packages/zero/src/transactions/lib.ts`.
 */
function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return (
      trimmed
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0] ?? null
    );
  }
}

function mergePlaidFields(
  existing: BankOption,
  row: { logoDomain?: string | null },
  plaidInstitution: { logo?: string | null; url?: string | null } | null | undefined,
): void {
  if (!existing.logo && plaidInstitution?.logo) {
    existing.logo = plaidInstitution.logo;
  }
  if (!existing.url) {
    existing.url = plaidInstitution?.url ?? normalizeDomain(row.logoDomain);
  }
}

export function useBankOptions(): BankOption[] {
  const [rows] = useQuery(queries.accounts.bankAccounts());
  return useMemo(() => {
    const byName = new Map<string, BankOption>();
    for (const row of rows) {
      const plaidInstitution = row.plaidConnection?.institution;
      const plaidName = row.plaidConnection?.institutionName;
      const fallbackName = row.institutionName ?? row.customName ?? row.name;
      const name = plaidInstitution?.name ?? plaidName ?? fallbackName;
      if (!name) {
        continue;
      }
      const key = name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        mergePlaidFields(existing, row, plaidInstitution);
        continue;
      }
      // id keeps the display-cased name so the transaction filter can match
      // it exactly against `institutionName` in the DB (no `lower()` in Zero).
      byName.set(key, {
        id: `bank:${name}`,
        logo: plaidInstitution?.logo ?? null,
        name,
        url: plaidInstitution?.url ?? normalizeDomain(row.logoDomain),
      });
    }
    return [...byName.values()].toSorted((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
}
