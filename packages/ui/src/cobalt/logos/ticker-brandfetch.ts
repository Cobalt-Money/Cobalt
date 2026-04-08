/**
 * Stock / ETF ticker logos via [Brandfetch Logo API](https://docs.brandfetch.com/logo-api/overview)
 * using the explicit `ticker/{SYMBOL}` route (`cdn.brandfetch.io/ticker/…/w/…/h/…?c=CLIENT_ID`).
 *
 * Implementation lives in `@cobalt-web/clients/brandfetch`; this module re-exports for `@cobalt-web/ui` consumers.
 */
export {
  brandfetchTickerDimensionsUrl,
  brandfetchTickerIconLettermarkFallbackUrl,
  brandfetchTickerIconUrls,
  brandfetchTickerLogoAssetUrl,
  normalizeTickerForBrandfetch,
} from "@cobalt-web/clients/brandfetch";
