import type {
  Color,
  ExtractionOptions,
  ImageSource,
  SwatchMap,
} from "colorthief";

import { loadImageForExtraction } from "./load-image-for-extraction";

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new TypeError("colorthief extraction is browser-only");
  }
}

/**
 * Dynamic import keeps `colorthief` out of server bundles that might accidentally
 * import this module.
 */
export function importColorThief() {
  ensureBrowser();
  return import("colorthief");
}

export async function extractDominantColorFromSource(
  source: ImageSource,
  options?: ExtractionOptions
): Promise<Color | null> {
  const { getColor } = await importColorThief();
  return getColor(source, options);
}

export async function extractPaletteFromSource(
  source: ImageSource,
  options?: ExtractionOptions
): Promise<Color[] | null> {
  const { getPalette } = await importColorThief();
  return getPalette(source, options);
}

export async function extractSwatchesFromSource(
  source: ImageSource,
  options?: ExtractionOptions
): Promise<SwatchMap> {
  const { getSwatches } = await importColorThief();
  return getSwatches(source, options);
}

export async function extractDominantColorFromUrl(
  url: string,
  options?: ExtractionOptions
): Promise<Color | null> {
  ensureBrowser();
  const signal = options?.signal;
  const img = await loadImageForExtraction(url, { signal });
  return extractDominantColorFromSource(img, options);
}

export async function extractPaletteFromUrl(
  url: string,
  options?: ExtractionOptions
): Promise<Color[] | null> {
  ensureBrowser();
  const signal = options?.signal;
  const img = await loadImageForExtraction(url, { signal });
  return extractPaletteFromSource(img, options);
}
