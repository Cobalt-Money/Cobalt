import { brandfetchIconDomainUrls } from "@cobalt-web/clients/brandfetch";
import { env } from "@cobalt-web/env/web";
import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
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

/** Prefer merchant counterparty, else first counterparty with a website. */
function websiteFromCounterparties(
  counterparties: TransactionResponse["counterparties"],
): string | null {
  if (!counterparties?.length) {
    return null;
  }
  const merchant = counterparties.find((c) => c.type === "merchant" && c.website?.trim());
  if (merchant?.website) {
    return merchant.website;
  }
  const withSite = counterparties.find((c) => c.website?.trim());
  return withSite?.website ?? null;
}

/** Plaid counterparty logos (merchant first, then others, deduped). */
function plaidLogoUrlsFromCounterparties(
  counterparties: TransactionResponse["counterparties"],
): string[] {
  if (!counterparties?.length) {
    return [];
  }
  const out: string[] = [];
  const preferred = counterparties.find(
    (c) => c.type === "merchant" && c.logo_url && isHttpUrl(c.logo_url),
  );
  if (preferred?.logo_url) {
    out.push(preferred.logo_url);
  }
  for (const c of counterparties) {
    if (c.logo_url && isHttpUrl(c.logo_url)) {
      pushUnique(out, c.logo_url);
    }
  }
  return out;
}

/**
 * Merchant logo sources (first loadable wins):
 * 1. Brandfetch **icon** only (`type=icon`, then lettermark) from `transaction.website` — fits round cells
 * 2. Same from counterparty `website` when hostname differs from step 1
 * 3. Plaid `logo_url` on the transaction, then counterparty `logo_url`s
 */
function buildMerchantLogoCandidates(
  row: Pick<TransactionResponse, "counterparties" | "logoUrl" | "website">,
): string[] {
  const out: string[] = [];
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const primaryHost = hostnameFromWebsite(row.website);
  const cpWebsite = websiteFromCounterparties(row.counterparties);
  const cpHost = hostnameFromWebsite(cpWebsite);

  const appendBrandfetchForHost = (host: string | null) => {
    if (!(clientId && host)) {
      return;
    }
    for (const u of brandfetchIconDomainUrls(host, clientId)) {
      pushUnique(out, u);
    }
  };

  appendBrandfetchForHost(primaryHost);
  if (cpHost && cpHost !== primaryHost) {
    appendBrandfetchForHost(cpHost);
  }

  if (row.logoUrl && isHttpUrl(row.logoUrl)) {
    pushUnique(out, row.logoUrl);
  }
  for (const u of plaidLogoUrlsFromCounterparties(row.counterparties)) {
    pushUnique(out, u);
  }

  return out;
}

export function MerchantLogo(
  props: Pick<TransactionResponse, "counterparties" | "logoUrl" | "merchantName" | "website"> & {
    /** Wrapper size (default `size-5` for table rows). */
    className?: string;
    deferUntilVisible?: boolean;
  },
) {
  const { className, counterparties, deferUntilVisible, logoUrl, merchantName, website } = props;
  const candidates = useMemo(
    () => buildMerchantLogoCandidates({ counterparties, logoUrl, website }),
    [counterparties, logoUrl, website],
  );
  const alt = merchantName?.trim() ? `${merchantName} logo` : "";
  const fallbackText = (() => {
    const t = merchantName?.trim();
    if (!t) {
      return "?";
    }
    return t.slice(0, 1).toUpperCase();
  })();

  return (
    <LogoImageWithFallback
      alt={alt}
      candidates={candidates}
      className={className}
      deferUntilVisible={deferUntilVisible}
      fallbackText={fallbackText}
      imgClassName="object-cover"
    />
  );
}
