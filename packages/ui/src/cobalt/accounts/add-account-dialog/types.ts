export type AddAccountProvider = "plaid" | "snaptrade";

export type AddAccountCategory = "bank" | "credit" | "brokerage";

export interface AddAccountInstitution {
  id: string;
  name: string;
  /** Domain or full URL — feeds Brandfetch/Logo.dev fallback chain in `InstitutionLogo`. */
  url: string | null;
  /** Plaid CDN logo (base64 or http URL). Tried after Brandfetch when present. */
  logo: string | null;
  provider: AddAccountProvider;
  /** SnapTrade broker slug; required when `provider === "snaptrade"`. */
  snaptradeBroker?: string;
  categories: readonly AddAccountCategory[];
  /** True for the curated trending strip / popular grid. */
  trending?: boolean;
}

export interface AddAccountChoice {
  institution: AddAccountInstitution;
  provider: AddAccountProvider;
}
