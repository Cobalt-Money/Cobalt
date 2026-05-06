import { CashAccountLogo } from "./cash-account-logo";
import { InstitutionLogo } from "../logos/institution-logo";

export interface AccountLogoProps {
  source: "plaid" | "snaptrade" | "manual";
  /** Raw `financial_account.subtype`. `subtype === "cash"` (case-insensitive) renders the cash glyph. */
  subtype: string | null;
  /**
   * Display name used for lettermark fallback when no logo resolves.
   * For Plaid/SnapTrade pass institution name; for manual pass institution-or-account name.
   */
  name: string | null;
  /**
   * Brandfetch domain (`financial_account.logo_domain` for manual; institution URL for Plaid).
   * Feeds the Brandfetch CDN candidate chain in {@link InstitutionLogo}.
   */
  logoDomain: string | null;
  /** Plaid CDN logo (institution.logo). Tried before Brandfetch when present. */
  institutionLogo?: string | null;
  /** Extra direct logo URLs (e.g. SnapTrade Passiv) tried after `institutionLogo`. */
  institutionLogosExtra?: readonly string[] | null;
  className?: string;
}

/**
 * Single source of truth for an account's avatar across the app (accounts list,
 * transactions table, transaction detail, add-transaction account picker).
 *
 * Resolution order:
 * 1. Manual + `subtype === "cash"` → green cash glyph.
 * 2. Otherwise → {@link InstitutionLogo}: Plaid/CDN logo → Brandfetch (`logoDomain`) → lettermark.
 */
export function AccountLogo({
  source,
  subtype,
  name,
  logoDomain,
  institutionLogo = null,
  institutionLogosExtra = null,
  className,
}: AccountLogoProps) {
  if (source === "manual" && subtype?.toLowerCase() === "cash") {
    return <CashAccountLogo className={className} />;
  }
  return (
    <InstitutionLogo
      className={className}
      institutionLogo={institutionLogo}
      institutionLogosExtra={institutionLogosExtra}
      institutionName={name}
      institutionUrl={logoDomain}
      source={source}
    />
  );
}
