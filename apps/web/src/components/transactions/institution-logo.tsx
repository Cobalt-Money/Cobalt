import { brandfetchLogoAssetUrl } from "@cobalt-web/clients/brandfetch";
import { logoDevUrlByDomain } from "@cobalt-web/clients/logo-dev";
import { env } from "@cobalt-web/env/web";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { useMemo } from "react";

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

/** Brandfetch CDN icon (SVG) when client id is set and `institutionUrl` resolves to a host. */
export function institutionBrandfetchUrlFromInstitutionUrl(
  institutionUrl: string | null | undefined
): string | null {
  const clientId = env.VITE_BRANDFETCH_CLIENT_ID;
  const host = hostnameFromInstitutionUrl(institutionUrl);
  if (!(clientId && host)) {
    return null;
  }
  return brandfetchLogoAssetUrl(host, clientId, {
    asset: "symbol",
    h: 128,
    w: 128,
  });
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
  const fromBrandfetch = institutionBrandfetchUrlFromInstitutionUrl(
    row.institutionUrl
  );
  if (fromBrandfetch) {
    out.push(fromBrandfetch);
  }
  // DEBUG: re-enable Plaid + Logo.dev after Brandfetch debugging
  // if (row.institutionLogo?.trim()) {
  //   const plaid = normalizeInstitutionLogoSrc(row.institutionLogo.trim());
  //   if (!out.includes(plaid)) {
  //     out.push(plaid);
  //   }
  // }
  // const fromLogoDev = institutionLogoDevUrlFromInstitutionUrl(
  //   row.institutionUrl
  // );
  // if (fromLogoDev && !out.includes(fromLogoDev)) {
  //   out.push(fromLogoDev);
  // }
  return out;
}

/**
 * Bank column glyph: Brandfetch (`institutionUrl` host) when `VITE_BRANDFETCH_CLIENT_ID`,
 * then Plaid/DB logo, then Logo.dev by host, then icon.
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
  const index = 0;

  // DEBUG: no bank icon fallback — empty cell if no Brandfetch URL
  if (candidates.length === 0 || index >= candidates.length) {
    return <div className="size-6 shrink-0" />;
  }

  const src = candidates[index];
  const alt = institutionName?.trim() ? `${institutionName} logo` : "Bank logo";

  return (
    <img
      alt={alt}
      className="size-6 shrink-0 rounded-sm object-cover"
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
