import { brandfetchLogoAssetUrl } from "@cobalt-web/clients/brandfetch";
import { env } from "@cobalt-web/env/web";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { useMemo } from "react";

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
 * Brandfetch (`website` domain) → Plaid `logo_url` → Logo.dev (`merchantName`).
 */
function buildMerchantLogoCandidates(
  row: Pick<TransactionListItem, "logoUrl" | "merchantName" | "website">
): string[] {
  const out: string[] = [];
  const { website } = row;
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const host = hostnameFromWebsite(website);
  if (clientId && host) {
    out.push(
      brandfetchLogoAssetUrl(host, clientId, {
        asset: "symbol",
        h: 128,
        w: 128,
      })
    );
  }
  // DEBUG: re-enable Plaid + Logo.dev after Brandfetch debugging
  // if (logoUrl && isAllowedLogoUrl(logoUrl) && !out.includes(logoUrl)) {
  //   out.push(logoUrl);
  // }
  // const token = env.VITE_LOGO_DEV_PUBLISHABLE_KEY;
  // const name = merchantName?.trim();
  // if (token && name) {
  //   const logoDevUrl = logoDevUrlByBrandName(name, { size: 64, token });
  //   if (!out.includes(logoDevUrl)) {
  //     out.push(logoDevUrl);
  //   }
  // }
  return out;
}

export function MerchantLogo(
  props: Pick<TransactionListItem, "logoUrl" | "merchantName" | "website">
) {
  const { logoUrl, merchantName, website } = props;
  const candidates = useMemo(
    () => buildMerchantLogoCandidates({ logoUrl, merchantName, website }),
    [logoUrl, merchantName, website]
  );
  const index = 0;

  // DEBUG: no icon fallback — empty cell if no Brandfetch URL
  if (candidates.length === 0 || index >= candidates.length) {
    return <div className="size-6 shrink-0" />;
  }

  const src = candidates[index];
  const alt = merchantName?.trim() ? `${merchantName} logo` : "";

  return (
    <img
      alt={alt}
      className="size-6 shrink-0 rounded-sm object-contain"
      height={24}
      src={src}
      width={24}
      onError={() => {
        // DEBUG: re-enable to fall through candidates
        // setIndex((i) => i + 1);
      }}
    />
  );
}
