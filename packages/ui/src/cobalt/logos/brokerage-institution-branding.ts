/**
 * Resolves institution logo URLs and homepage for SnapTrade brokerage rows
 * (AWS meta, Passiv S3 fallbacks, name→homepage heuristics).
 */

/** SnapTrade publishes brokerage logos under this bucket (see API brokerage reference). */
const PASSIV_BROKERAGE_LOGOS_ORIGIN =
  "https://passiv-brokerage-logos.s3.ca-central-1.amazonaws.com";

function pickSnapTradeLogoFieldsFromRecord(o: Record<string, unknown>): {
  aws: string | null;
  sq: string | null;
  url: string | null;
} {
  return {
    aws:
      typeof o.aws_s3_logo_url === "string" ? o.aws_s3_logo_url.trim() : null,
    sq:
      typeof o.aws_s3_square_logo_url === "string"
        ? o.aws_s3_square_logo_url.trim()
        : null,
    url: typeof o.url === "string" ? o.url.trim() : null,
  };
}

/** SnapTrade `Brokerage` JSON (or subset) sometimes stored on `brokerage_authorization.meta`. */
function snapTradeLogoFieldsFromUnknown(meta: unknown): {
  awsS3LogoUrl: string | null;
  awsS3SquareLogoUrl: string | null;
  url: string | null;
} {
  if (meta === null || meta === undefined) {
    return { awsS3LogoUrl: null, awsS3SquareLogoUrl: null, url: null };
  }
  if (typeof meta !== "object") {
    return { awsS3LogoUrl: null, awsS3SquareLogoUrl: null, url: null };
  }
  const root = meta as Record<string, unknown>;
  const nested =
    root.brokerage && typeof root.brokerage === "object"
      ? (root.brokerage as Record<string, unknown>)
      : root;
  const a = pickSnapTradeLogoFieldsFromRecord(root);
  const b = nested === root ? null : pickSnapTradeLogoFieldsFromRecord(nested);
  return {
    awsS3LogoUrl: a.aws ?? b?.aws ?? null,
    awsS3SquareLogoUrl: a.sq ?? b?.sq ?? null,
    url: a.url ?? b?.url ?? null,
  };
}

function isLikelyUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim()
  );
}

/** Public homepages for Brandfetch / Logo.dev when SnapTrade meta has no `url`. */
function inferBrokerHomepageUrl(institutionName: string): string | null {
  const n = institutionName.toLowerCase();
  const pairs: [string, string][] = [
    ["interactive brokers", "https://www.interactivebrokers.com"],
    ["ibkr", "https://www.interactivebrokers.com"],
    ["fidelity", "https://www.fidelity.com"],
    ["charles schwab", "https://www.schwab.com"],
    ["schwab", "https://www.schwab.com"],
    ["robinhood", "https://robinhood.com"],
    ["td ameritrade", "https://www.tdameritrade.com"],
    ["etrade", "https://us.etrade.com"],
    ["e*trade", "https://us.etrade.com"],
    ["webull", "https://www.webull.com"],
    ["merrill", "https://www.merrilledge.com"],
    ["ally invest", "https://www.ally.com"],
    ["sofi", "https://www.sofi.com"],
    ["vanguard", "https://investor.vanguard.com"],
    ["wealthsimple", "https://www.wealthsimple.com"],
    ["questrade", "https://www.questrade.com"],
    ["tradestation", "https://www.tradestation.com"],
    ["tastytrade", "https://tastytrade.com"],
    ["firstrade", "https://www.firstrade.com"],
  ];
  for (const [needle, url] of pairs) {
    if (n.includes(needle)) {
      return url;
    }
  }
  return null;
}

function passivLogoUrlsForSlug(slug: string): string[] {
  const s = slug.trim();
  if (!s) {
    return [];
  }
  const fileSlug = s.toLowerCase().replaceAll("_", "-");
  const base = PASSIV_BROKERAGE_LOGOS_ORIGIN;
  return [
    `${base}/${fileSlug}-logo-square.png`,
    `${base}/${fileSlug}-logo.png`,
  ];
}

function dedupeUrlList(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) {
      return false;
    }
    seen.add(u);
    return true;
  });
}

type BrokerageAuthForPassivLogos =
  | {
      brokerage?: string | null;
      brokerageSlug?: string | null;
    }
  | null
  | undefined;

function collectPassivUrlsFromAuth(
  auth: BrokerageAuthForPassivLogos
): string[] {
  const slugCandidates = new Set<string>();
  const addSlug = (raw: string | null | undefined) => {
    const t = raw?.trim();
    if (t && !isLikelyUuid(t)) {
      slugCandidates.add(t);
    }
  };
  addSlug(auth?.brokerageSlug);
  addSlug(auth?.brokerage);
  const passivUrls: string[] = [];
  for (const slug of slugCandidates) {
    passivUrls.push(...passivLogoUrlsForSlug(slug));
  }
  return dedupeUrlList(passivUrls);
}

function passivExtrasForLogo(
  dedupedPassiv: string[],
  primary: string | null,
  hasMetaLogo: boolean
): string[] {
  if (hasMetaLogo) {
    return dedupedPassiv.filter((u) => u !== primary);
  }
  return dedupedPassiv.slice(1).filter((u) => u !== primary);
}

export function brokerageInstitutionBranding(row: {
  institutionName: string | null | undefined;
  metaData?: unknown | null;
  brokerageAuthorization?: {
    brokerage?: string | null;
    brokerageSlug?: string | null;
    meta?: unknown | null;
  } | null;
}): {
  institutionLogo: string | null;
  institutionLogosExtra: string[];
  institutionUrl: string | null;
} {
  const auth = row.brokerageAuthorization;
  const fromAccount = snapTradeLogoFieldsFromUnknown(row.metaData);
  const fromAuth = snapTradeLogoFieldsFromUnknown(auth?.meta);

  const awsS3SquareLogoUrl =
    fromAccount.awsS3SquareLogoUrl ?? fromAuth.awsS3SquareLogoUrl ?? null;
  const awsS3LogoUrl =
    fromAccount.awsS3LogoUrl ?? fromAuth.awsS3LogoUrl ?? null;
  let institutionUrl =
    fromAccount.url ??
    fromAuth.url ??
    inferBrokerHomepageUrl(row.institutionName ?? "") ??
    null;

  const dedupedPassiv = collectPassivUrlsFromAuth(auth);
  const hasMetaLogo = Boolean(awsS3SquareLogoUrl || awsS3LogoUrl);
  const institutionLogo =
    awsS3SquareLogoUrl ?? awsS3LogoUrl ?? dedupedPassiv[0] ?? null;
  const institutionLogosExtra = passivExtrasForLogo(
    dedupedPassiv,
    institutionLogo,
    hasMetaLogo
  );

  if (!institutionLogo && !institutionUrl) {
    institutionUrl = inferBrokerHomepageUrl(row.institutionName ?? "");
  }

  return {
    institutionLogo,
    institutionLogosExtra,
    institutionUrl,
  };
}
