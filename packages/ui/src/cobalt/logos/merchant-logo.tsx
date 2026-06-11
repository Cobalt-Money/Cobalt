import { brandfetchIconDomainUrls } from "@cobalt-web/clients/brandfetch";
import { env } from "@cobalt-web/env/web";
import { useMemo } from "react";

import { LogoImageWithFallback } from "./logo-image-fallback";

function pushUnique(out: string[], url: string | null | undefined): void {
  if (!url?.trim()) {
    return;
  }
  if (!out.includes(url)) {
    out.push(url);
  }
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function hostnameFromWebsite(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Merchant logo sources (first loadable wins):
 * 1. Brandfetch icon CDN keyed off `website` host
 * 2. Plaid `logoUrl` on the transaction
 *
 * Plaid `counterparties[]` is intentionally NOT consulted — payment_terminal /
 * payment_processor counterparties (Toast, Square, Stripe…) carry website +
 * logo_url for the POS plumbing, not the actual merchant. Pulling them in
 * resulted in every Toast-powered restaurant rendering the Toast logo. The
 * merchant counterparty rarely has its own website when `transaction.website`
 * is null, so dropping the entire branch costs little and keeps the component
 * uniform across panels, table rows, and the detail card.
 */
export interface MerchantLogoInput {
  logoUrl: string | null;
  website: string | null;
  merchantName: string | null;
}

function buildMerchantLogoCandidates(row: Omit<MerchantLogoInput, "merchantName">): string[] {
  const out: string[] = [];
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const host = hostnameFromWebsite(row.website);
  if (clientId && host) {
    for (const u of brandfetchIconDomainUrls(host, clientId)) {
      pushUnique(out, u);
    }
  }
  if (row.logoUrl && isHttpUrl(row.logoUrl)) {
    pushUnique(out, row.logoUrl);
  }
  return out;
}

export function MerchantLogo(
  props: MerchantLogoInput & {
    /** Wrapper size (default `size-5` for table rows). */
    className?: string;
  },
) {
  const { className, logoUrl, merchantName, website } = props;
  const candidates = useMemo(
    () => buildMerchantLogoCandidates({ logoUrl, website }),
    [logoUrl, website],
  );
  return (
    <LogoImageWithFallback
      alt={merchantName ? `${merchantName} logo` : ""}
      candidates={candidates}
      className={className}
      fallbackText={merchantName ?? "?"}
      imgClassName="object-cover"
    />
  );
}
