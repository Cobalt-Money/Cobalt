import { logoDevUrlByBrandName } from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";

function isAllowedLogoUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  );
}

/**
 * Plaid `logo_url` when present; otherwise Logo.dev by `merchantName` when a publishable key is set.
 */
export function resolveMerchantLogoUrl(
  row: Pick<TransactionListItem, "logoUrl" | "merchantName">
): string | null {
  const { logoUrl, merchantName } = row;
  if (logoUrl && isAllowedLogoUrl(logoUrl)) {
    return logoUrl;
  }
  const token = env.VITE_LOGO_DEV_PUBLISHABLE_KEY;
  const name = merchantName?.trim();
  if (!(token && name)) {
    return null;
  }
  return logoDevUrlByBrandName(name, { size: 64, token });
}
