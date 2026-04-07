/**
 * Client-side helpers around [colorthief](https://github.com/lokesh/color-thief) for
 * dominant colors, palettes, and semantic swatches.
 *
 * **CORS:** Extraction reads pixels via canvas. Remote URLs must be loaded with
 * `crossOrigin = "anonymous"` (see `loadImageForExtraction`) and the image host must
 * send `Access-Control-Allow-Origin` or the canvas stays tainted and sampling fails.
 * In-app `<img>` used for display (e.g. logos) may omit `crossOrigin`; use this module’s
 * loader for extraction-only loads.
 *
 * **Browser-only:** Do not import these modules from server-only code (`createServerFn`,
 * Nitro handlers). Dynamic `import("colorthief")` is used in `extract.ts` to avoid
 * pulling canvas/DOM code into server bundles. The app uses TanStack Start with
 * `spa.enabled`; still keep extraction in client components / `useEffect`.
 */

export type { Color, ExtractionOptions, SwatchMap } from "colorthief";

export {
  AURORA_FALLBACK_BACKGROUND,
  AURORA_FALLBACK_BORDER,
  deriveAuroraThemeFromHex,
} from "./derive-aurora-theme";
export type { AuroraThemeStyle } from "./derive-aurora-theme";

export {
  extractDominantColorFromSource,
  extractDominantColorFromUrl,
  extractPaletteFromSource,
  extractPaletteFromUrl,
  extractSwatchesFromSource,
  importColorThief,
} from "./extract";

export { loadImageForExtraction } from "./load-image-for-extraction";

export { useDominantColor, useImagePalette } from "./use-image-palette";

export type {
  ImagePaletteStatus,
  UseDominantColorResult,
  UseImagePaletteResult,
} from "./use-image-palette";
