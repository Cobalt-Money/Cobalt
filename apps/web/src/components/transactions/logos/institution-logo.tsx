import { brandfetchIconDomainUrls } from "@cobalt-web/clients/brandfetch";
import { logoDevUrlByDomain } from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { useMemo } from "react";

import { LogoImageWithFallback } from "./logo-image-fallback";

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

/** Logo.dev domain logo by institution URL. */
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
  row: Pick<TransactionListItem, "institutionUrl">
): string[] {
  const out: string[] = [];
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const host = hostnameFromInstitutionUrl(row.institutionUrl);
  console.info("[institution-logo] building candidates", {
    hasBrandfetchClientId: !!clientId,
    hasLogoDevKey: !!env.VITE_LOGO_DEV_PUBLISHABLE_KEY,
    host,
    institutionUrl: row.institutionUrl,
  });
  if (clientId && host) {
    out.push(...brandfetchIconDomainUrls(host, clientId));
  }
  const fromLogoDev = institutionLogoDevUrlFromInstitutionUrl(
    row.institutionUrl
  );
  if (fromLogoDev && !out.includes(fromLogoDev)) {
    out.push(fromLogoDev);
  }
  console.info("[institution-logo] candidates:", out);
  return out;
}

/**
 * Bank column glyph: Brandfetch icon chain (`type=icon` → lettermark) for round tiles,
 * then Logo.dev by host, then letter initial.
 */
export function InstitutionLogo(
  props: Pick<TransactionListItem, "institutionName" | "institutionUrl">
) {
  const { institutionName, institutionUrl } = props;
  const candidates = useMemo(
    () => buildInstitutionLogoCandidates({ institutionUrl }),
    [institutionUrl]
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
