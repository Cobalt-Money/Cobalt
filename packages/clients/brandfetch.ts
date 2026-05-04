/**
 * Brandfetch Logo API (CDN) — {@link https://docs.brandfetch.com/logo-api/overview}
 * Free tier: pass `clientId` from the Developer Portal on every request (`c` query param).
 *
 * Path: `https://cdn.brandfetch.io/domain/{domain}/w/{w}/h/{h}/[{theme/light|dark}/]{segment}?c=…`
 * Ticker: `https://cdn.brandfetch.io/ticker/{TICKER}/w/{w}/h/{h}/?c=…` — see {@link brandfetchTickerDimensionsUrl}.
 * For `logo` and `symbol`, optional `.svg` suffix via `svg` (default true for logo/symbol).
 *
 * Some responses use **dimensions only** (no `logo` / `symbol` / `icon` segment):
 * `…/domain/{domain}/w/{w}/h/{h}/?c=…` — see {@link brandfetchDimensionsOnlyUrl}.
 */

const BRANDFETCH_CDN_ORIGIN = "https://cdn.brandfetch.io" as const;
const BRANDFETCH_API_ORIGIN = "https://api.brandfetch.io" as const;

export interface BrandfetchSearchResult {
  brandId: string;
  claimed: boolean;
  domain: string | null;
  icon: string | null;
  name: string;
}

/**
 * Brand Search API (free tier with `clientId`).
 * Typeahead lookup by brand name or domain.
 * @see https://docs.brandfetch.com/reference/searchbrands
 */
export async function brandfetchSearch(
  query: string,
  clientId: string,
  options?: { signal?: AbortSignal },
): Promise<BrandfetchSearchResult[]> {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const url = new URL(`${BRANDFETCH_API_ORIGIN}/v2/search/${encodeURIComponent(q)}`);
  url.searchParams.set("c", clientId);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!res.ok) {
    return [];
  }
  const raw = (await res.json()) as {
    brandId?: unknown;
    claimed?: unknown;
    domain?: unknown;
    icon?: unknown;
    name?: unknown;
  }[];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((r): BrandfetchSearchResult[] => {
    if (typeof r.name !== "string" || typeof r.brandId !== "string") {
      return [];
    }
    return [
      {
        brandId: r.brandId,
        claimed: typeof r.claimed === "boolean" ? r.claimed : false,
        domain: typeof r.domain === "string" ? r.domain : null,
        icon: typeof r.icon === "string" ? r.icon : null,
        name: r.name,
      },
    ];
  });
}

function normalizeDomainInput(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) {
    throw new Error("brandfetch: domain is required");
  }
  let host = trimmed;
  if (host.includes("://")) {
    try {
      host = new URL(host).hostname;
    } catch {
      throw new Error("brandfetch: invalid domain URL");
    }
  }
  host = host.replace(/^www\./, "").split("/")[0] ?? host;
  return host.toLowerCase();
}

/** Uppercase stock/ETF ticker suitable for Brandfetch `ticker/` paths, or `null` if not usable. */
export function normalizeTickerForBrandfetch(ticker: string): string | null {
  const t = ticker.trim().toUpperCase();
  if (!t || t === "—") {
    return null;
  }
  if (!/^[A-Z0-9./-]+$/.test(t)) {
    return null;
  }
  return t;
}

function normalizeTickerInput(ticker: string): string {
  const t = normalizeTickerForBrandfetch(ticker);
  if (!t) {
    throw new Error("brandfetch: invalid or empty ticker");
  }
  return t;
}

function buildTickerCdnPath(
  symbol: string,
  w: number,
  h: number,
  segment: string,
  theme?: BrandfetchTheme,
): string {
  const sym = normalizeTickerInput(symbol);
  const themePrefix = theme ? `theme/${theme}/` : "";
  return `${BRANDFETCH_CDN_ORIGIN}/ticker/${encodeURIComponent(sym)}/w/${w}/h/${h}/${themePrefix}${segment}`;
}

/**
 * CDN URL with width/height only — ticker identifier (no `logo` / `symbol` / `icon` segment).
 * @example https://cdn.brandfetch.io/ticker/AAPL/w/400/h/400/?c=CLIENT_ID
 */
export function brandfetchTickerDimensionsUrl(
  ticker: string,
  clientId: string,
  options?: { h?: number; w?: number },
): string {
  const sym = normalizeTickerInput(ticker);
  const w = options?.w ?? 400;
  const h = options?.h ?? 400;
  const url = new URL(`${BRANDFETCH_CDN_ORIGIN}/ticker/${encodeURIComponent(sym)}/w/${w}/h/${h}/`);
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * Explicit width/height and asset for a **ticker** (`logo` | `icon` | `symbol`).
 * @see https://docs.brandfetch.com/logo-api/overview — `ticker/NKE`, type routes
 */
export function brandfetchTickerLogoAssetUrl(
  ticker: string,
  clientId: string,
  options: {
    asset?: BrandfetchLogoAsset;
    h?: number;
    svg?: boolean;
    theme?: BrandfetchTheme;
    w?: number;
  } = {},
): string {
  const w = options.w ?? 800;
  const h = options.h ?? 800;
  const asset = options.asset ?? "symbol";
  const segment = assetPathSegment(asset, options.svg);
  const url = new URL(buildTickerCdnPath(ticker, w, h, segment, options.theme));
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * `type=icon` with `fallback=lettermark` for a stock/ETF ticker.
 * @example …/ticker/NKE/w/128/h/128/fallback/lettermark/type/icon?c=…
 */
export function brandfetchTickerIconLettermarkFallbackUrl(
  ticker: string,
  clientId: string,
  options?: { h?: number; theme?: BrandfetchTheme; w?: number },
): string {
  const sym = normalizeTickerInput(ticker);
  const w = options?.w ?? 128;
  const h = options?.h ?? 128;
  const themePart = options?.theme ? `theme/${options.theme}/` : "";
  const path = `${BRANDFETCH_CDN_ORIGIN}/ticker/${encodeURIComponent(sym)}/w/${w}/h/${h}/${themePart}fallback/lettermark/type/icon`;
  const url = new URL(path);
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * **Icon-only** chain for small circular avatars — same idea as {@link brandfetchIconDomainUrls}
 * but using the Logo API **ticker** route.
 *
 * @param options.size — Square edge length for CDN `w`/`h` (default **128**).
 */
export function brandfetchTickerIconUrls(
  ticker: string,
  clientId: string,
  options?: { size?: number },
): string[] {
  const size = options?.size ?? 128;
  return [
    brandfetchTickerLogoAssetUrl(ticker, clientId, {
      asset: "icon",
      h: size,
      w: size,
    }),
    brandfetchTickerIconLettermarkFallbackUrl(ticker, clientId, {
      h: size,
      w: size,
    }),
  ];
}

export type BrandfetchLogoAsset = "icon" | "logo" | "symbol";

export type BrandfetchTheme = "dark" | "light";

/** Last path segment: bare `icon`, or `logo` / `symbol` with optional `.svg`. */
function assetPathSegment(asset: BrandfetchLogoAsset, svg: boolean | undefined): string {
  const useSvgVariant = svg !== false && (asset === "logo" || asset === "symbol");
  if (useSvgVariant) {
    return `${asset}.svg`;
  }
  return asset;
}

function buildCdnPath(
  host: string,
  w: number,
  h: number,
  segment: string,
  theme?: BrandfetchTheme,
): string {
  const themePrefix = theme ? `theme/${theme}/` : "";
  return `${BRANDFETCH_CDN_ORIGIN}/domain/${host}/w/${w}/h/${h}/${themePrefix}${segment}`;
}

/**
 * CDN URL with width/height only — no `logo` / `symbol` / `icon` path segment (trailing slash before `?c=`).
 * @example https://cdn.brandfetch.io/domain/x.com/w/128/h/128/?c=CLIENT_ID
 */
export function brandfetchDimensionsOnlyUrl(
  domain: string,
  clientId: string,
  options?: { h?: number; w?: number },
): string {
  const host = normalizeDomainInput(domain);
  const w = options?.w ?? 128;
  const h = options?.h ?? 128;
  const url = new URL(`${BRANDFETCH_CDN_ORIGIN}/domain/${host}/w/${w}/h/${h}/`);
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * Default asset URL (`symbol`, SVG variant). Width/height default to 400×400.
 * @example https://cdn.brandfetch.io/domain/chase.com/w/400/h/400/symbol.svg?c=CLIENT_ID
 */
export function brandfetchDefaultLogoUrl(
  domain: string,
  clientId: string,
  options?: {
    h?: number;
    svg?: boolean;
    theme?: BrandfetchTheme;
    w?: number;
  },
): string {
  const host = normalizeDomainInput(domain);
  const segment = assetPathSegment("symbol", options?.svg);
  const w = options?.w ?? 400;
  const h = options?.h ?? 400;
  const url = new URL(buildCdnPath(host, w, h, segment, options?.theme));
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * Explicit width/height and asset (`logo` | `icon` | `symbol`).
 * Use `theme: 'light' | 'dark'` for paths like `…/theme/light/symbol` (often paired with `svg: false`).
 * @example https://cdn.brandfetch.io/domain/spotify.com/w/800/h/800/theme/light/symbol?c=CLIENT_ID
 */
export function brandfetchLogoAssetUrl(
  domain: string,
  clientId: string,
  options: {
    asset?: BrandfetchLogoAsset;
    h?: number;
    svg?: boolean;
    theme?: BrandfetchTheme;
    w?: number;
  } = {},
): string {
  const host = normalizeDomainInput(domain);
  const w = options.w ?? 800;
  const h = options.h ?? 800;
  const asset = options.asset ?? "symbol";
  const segment = assetPathSegment(asset, options.svg);
  const url = new URL(buildCdnPath(host, w, h, segment, options.theme));
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * `type=icon` with `fallback=lettermark`.
 *
 * Per Logo API, **`fallback`** (`brandfetch` | `transparent` | `lettermark` | `404`) is only
 * meaningful for **`type=icon`**. For `logo` and `symbol`, defaults differ (e.g. `transparent`),
 * and **`lettermark` applies only to `type=icon`**. Here we request `icon` so missing icons resolve
 * to a brand lettermark instead of the default **`brandfetch`** placeholder logo.
 *
 * @see https://docs.brandfetch.com/logo-api/parameters — `fallback`, `type`
 * @example …/domain/x.com/w/128/h/128/fallback/lettermark/type/icon?c=…
 */
export function brandfetchIconLettermarkFallbackUrl(
  domain: string,
  clientId: string,
  options?: { h?: number; theme?: BrandfetchTheme; w?: number },
): string {
  const host = normalizeDomainInput(domain);
  const w = options?.w ?? 128;
  const h = options?.h ?? 128;
  const themePart = options?.theme ? `theme/${options.theme}/` : "";
  const path = `${BRANDFETCH_CDN_ORIGIN}/domain/${host}/w/${w}/h/${h}/${themePart}fallback/lettermark/type/icon`;
  const url = new URL(path);
  url.searchParams.set("c", clientId);
  return url.toString();
}

/**
 * **Icon-only** chain for small circular avatars — Brandfetch `type=icon` (social/app-style,
 * squarish) then lettermark fallback. Prefer this over {@link brandfetchDomainFallbackUrls} when
 * the UI is a round tile (wide wordmarks look wrong in a circle).
 *
 * @param options.size — Square edge length for CDN `w`/`h` (default **128**).
 * @see https://docs.brandfetch.com/logo-api/parameters — `type`: icon
 */
export function brandfetchIconDomainUrls(
  domain: string,
  clientId: string,
  options?: { size?: number },
): string[] {
  const size = options?.size ?? 128;
  return [
    brandfetchLogoAssetUrl(domain, clientId, {
      asset: "icon",
      h: size,
      w: size,
    }),
    brandfetchIconLettermarkFallbackUrl(domain, clientId, { h: size, w: size }),
  ];
}

/**
 * Ordered Brandfetch Logo API attempts for a **domain** identifier (symbol → logo → icon fallback → dimensions).
 * @see https://docs.brandfetch.com/logo-api/parameters — `type`, `fallback`
 *
 * 1. **symbol** (SVG) — universal mark
 * 2. **logo** (SVG) — horizontal **wordmark** (company name as artwork on large surfaces)
 * 3. **icon + lettermark** — only `type=icon` can use `fallback=lettermark` (see `fallback` enum in
 *    docs); avoids the default `fallback=brandfetch` when the icon asset is missing
 * 4. **Dimensions only** — `…/domain/{host}/w/{w}/h/{h}/` (CDN default asset)
 */
export function brandfetchDomainFallbackUrls(
  domain: string,
  clientId: string,
  options?: { h?: number; w?: number },
): string[] {
  const w = options?.w ?? 128;
  const h = options?.h ?? 128;
  return [
    brandfetchLogoAssetUrl(domain, clientId, {
      asset: "symbol",
      h,
      svg: true,
      w,
    }),
    brandfetchLogoAssetUrl(domain, clientId, {
      asset: "logo",
      h,
      svg: true,
      w,
    }),
    brandfetchIconLettermarkFallbackUrl(domain, clientId, { h, w }),
    brandfetchDimensionsOnlyUrl(domain, clientId, { h, w }),
  ];
}
