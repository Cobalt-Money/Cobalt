import { brandfetchIconDomainUrls } from "@cobalt-web/clients/brandfetch";
import { logoDevUrlByDomain } from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { useMemo } from "react";

import { LogoImageWithFallback } from "./logo-image-fallback";

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
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
  if (clientId && host) {
    out.push(...brandfetchIconDomainUrls(host, clientId));
  }
  const fromLogoDev = institutionLogoDevUrlFromInstitutionUrl(
    row.institutionUrl
  );
  if (fromLogoDev && !out.includes(fromLogoDev)) {
    out.push(fromLogoDev);
  }
  return out;
}

export type InstitutionLogoSource = Pick<
  TransactionListItem,
  "institutionUrl"
> & {
  institutionLogo?: string | null;
  /** Additional direct logo URLs tried after `institutionLogo` (e.g. SnapTrade Passiv fallbacks). */
  institutionLogosExtra?: readonly string[] | null;
};

/**
 * Same candidate order as {@link InstitutionLogo}: direct Plaid/CDN URL first,
 * then Brandfetch / Logo.dev from `institutionUrl`.
 */
export function buildInstitutionLogoImageCandidates(
  props: InstitutionLogoSource
): string[] {
  const fromDomain = buildInstitutionLogoCandidates({
    institutionUrl: props.institutionUrl,
  });
  const primaries: string[] = [];
  const primary = props.institutionLogo?.trim();
  if (primary && isHttpUrl(primary)) {
    primaries.push(primary);
  }
  for (const u of props.institutionLogosExtra ?? []) {
    const t = u.trim();
    if (t && isHttpUrl(t) && !primaries.includes(t)) {
      primaries.push(t);
    }
  }
  if (primaries.length === 0) {
    return fromDomain;
  }
  const merged: string[] = [];
  for (const p of primaries) {
    if (!merged.includes(p) && !fromDomain.includes(p)) {
      merged.push(p);
    }
  }
  return [...merged, ...fromDomain];
}

/**
 * First HTTP(S) image URL used for the bank glyph — same as the first logo
 * candidate. Use this for Color Thief / canvas sampling so aurora matches the
 * visible logo when possible.
 */
export function firstInstitutionLogoImageUrlForSampling(
  props: InstitutionLogoSource
): string | null {
  const [first] = buildInstitutionLogoImageCandidates(props);
  return first ?? null;
}

/**
 * Bank column glyph: optional Plaid `institutionLogo`, then Brandfetch icon chain
 * (`type=icon` → lettermark), Logo.dev by host, then letter initial.
 */
export function InstitutionLogo(
  props: Pick<TransactionListItem, "institutionName" | "institutionUrl"> & {
    className?: string;
    /** Plaid / institution CDN logo; tried before Brandfetch when HTTP(S). */
    institutionLogo?: string | null;
    institutionLogosExtra?: readonly string[] | null;
  }
) {
  const {
    className,
    institutionLogo,
    institutionLogosExtra,
    institutionName,
    institutionUrl,
  } = props;
  const candidates = useMemo(
    () =>
      buildInstitutionLogoImageCandidates({
        institutionLogo,
        institutionLogosExtra,
        institutionUrl,
      }),
    [institutionLogo, institutionLogosExtra, institutionUrl]
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
      className={className}
      fallbackText={fallbackText}
      imgClassName="object-cover"
    />
  );
}
