import { brandfetchIconDomainUrls } from "@cobalt-web/clients/brandfetch";
import { logoDevUrlByDomain } from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { useMemo } from "react";

import { LogoImageWithFallback } from "./logo-image-fallback";

/** Plaid often stores raw base64; sometimes a full data URL or https URL. */
export function normalizeInstitutionLogoSrc(logo: string): string {
  const t = logo.trim();
  if (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("data:")
  ) {
    return t;
  }
  return `data:image/png;base64,${t}`;
}

function hostnameFromInstitutionUrl(
  url: string | null | undefined
): string | null {
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

/** Logo.dev domain logo when Plaid logo is missing or fails (matches horizon-test). */
export function institutionLogoDevUrlFromInstitutionUrl(
  institutionUrl: string | null | undefined
): string | null {
  const token = env.VITE_LOGO_DEV_PUBLISHABLE_KEY;
  const host = hostnameFromInstitutionUrl(institutionUrl);
  if (!(token && host)) {
    return null;
  }
  return logoDevUrlByDomain(host, { size: 64, token });
}

function buildInstitutionLogoCandidates(
  row: Pick<TransactionListItem, "institutionLogo" | "institutionUrl">
): string[] {
  const out: string[] = [];
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const host = hostnameFromInstitutionUrl(row.institutionUrl);
  if (clientId && host) {
    out.push(...brandfetchIconDomainUrls(host, clientId));
  }
  if (row.institutionLogo?.trim()) {
    const plaid = normalizeInstitutionLogoSrc(row.institutionLogo.trim());
    if (!out.includes(plaid)) {
      out.push(plaid);
    }
  }
  const fromLogoDev = institutionLogoDevUrlFromInstitutionUrl(
    row.institutionUrl
  );
  if (fromLogoDev && !out.includes(fromLogoDev)) {
    out.push(fromLogoDev);
  }
  return out;
}

/**
 * Bank column glyph: Brandfetch **icon** chain (`type=icon` → lettermark) for round tiles
 * when `VITE_BRANDFETCH_CLIENT_ID`, then Plaid/DB logo, then Logo.dev by host, then icon.
 */
export function InstitutionLogo(
  props: Pick<
    TransactionListItem,
    "institutionLogo" | "institutionName" | "institutionUrl"
  >
) {
  const { institutionLogo, institutionName, institutionUrl } = props;
  const candidates = useMemo(
    () => buildInstitutionLogoCandidates({ institutionLogo, institutionUrl }),
    [institutionLogo, institutionUrl]
  );
  const alt = institutionName?.trim() ? `${institutionName} logo` : "Bank logo";
  const fallbackText = (() => {
    const t = institutionName?.trim();
    if (!t) {
      return "?";
    }
    return t.slice(0, 1).toUpperCase();
  })();

  return (
    <LogoImageWithFallback
      alt={alt}
      candidates={candidates}
      fallbackText={fallbackText}
      imgClassName="object-cover"
    />
  );
}
