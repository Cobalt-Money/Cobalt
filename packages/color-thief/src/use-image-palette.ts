import type { Color, ExtractionOptions, SwatchMap } from "colorthief";
import { useEffect, useRef, useState } from "react";

import {
  extractDominantColorFromUrl,
  extractPaletteFromUrl,
  extractSwatchesFromSource,
} from "./extract";
import { loadImageForExtraction } from "./load-image-for-extraction";

export type ImagePaletteStatus = "idle" | "loading" | "success" | "error";

export interface UseImagePaletteResult {
  dominant: Color | null;
  dominantHex: string | null;
  error: Error | null;
  palette: Color[] | null;
  status: ImagePaletteStatus;
  swatches: SwatchMap | null;
}

/**
 * Loads an image URL (with `crossOrigin = "anonymous"`) and runs `colorthief`
 * extraction on the client. Abort-safe on URL change or unmount.
 */
export function useImagePalette(
  url: string | null,
  options?: ExtractionOptions & { includeSwatches?: boolean },
): UseImagePaletteResult {
  const { includeSwatches = false, ...extractionOptions } = options ?? {};
  const extractionRef = useRef(extractionOptions);
  extractionRef.current = extractionOptions;

  const [state, setState] = useState<UseImagePaletteResult>({
    dominant: null,
    dominantHex: null,
    error: null,
    palette: null,
    status: "idle",
    swatches: null,
  });

  useEffect(() => {
    if (!url?.trim()) {
      setState({
        dominant: null,
        dominantHex: null,
        error: null,
        palette: null,
        status: "idle",
        swatches: null,
      });
      return;
    }

    const ac = new AbortController();
    const { signal } = ac;

    setState({
      dominant: null,
      dominantHex: null,
      error: null,
      palette: null,
      status: "loading",
      swatches: null,
    });

    (async () => {
      const mergedOptions: ExtractionOptions = {
        ...extractionRef.current,
        signal,
      };

      try {
        const [dominant, palette] = await Promise.all([
          extractDominantColorFromUrl(url, mergedOptions),
          extractPaletteFromUrl(url, mergedOptions),
        ]);

        let swatches: SwatchMap | null = null;
        if (includeSwatches) {
          const img = await loadImageForExtraction(url, { signal });
          swatches = await extractSwatchesFromSource(img, mergedOptions);
        }

        if (signal.aborted) {
          return;
        }

        setState({
          dominant,
          dominantHex: dominant?.hex() ?? null,
          error: null,
          palette,
          status: "success",
          swatches,
        });
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        const normalized = error instanceof Error ? error : new Error(String(error));
        setState({
          dominant: null,
          dominantHex: null,
          error: normalized,
          palette: null,
          status: "error",
          swatches: null,
        });
      }
    })();

    return () => {
      ac.abort();
    };
  }, [url, includeSwatches]);

  return state;
}

export interface UseDominantColorResult {
  color: Color | null;
  error: Error | null;
  hex: string | null;
  status: ImagePaletteStatus;
}

/**
 * Thin wrapper: dominant color only (fewer palette calls than `useImagePalette`).
 */
export function useDominantColor(
  url: string | null,
  options?: ExtractionOptions,
): UseDominantColorResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<UseDominantColorResult>({
    color: null,
    error: null,
    hex: null,
    status: "idle",
  });

  useEffect(() => {
    if (!url?.trim()) {
      setState({
        color: null,
        error: null,
        hex: null,
        status: "idle",
      });
      return;
    }

    const ac = new AbortController();
    const { signal } = ac;

    setState({
      color: null,
      error: null,
      hex: null,
      status: "loading",
    });

    (async () => {
      const mergedOptions: ExtractionOptions = {
        ...optionsRef.current,
        signal,
      };

      try {
        const dominant = await extractDominantColorFromUrl(url, mergedOptions);
        if (signal.aborted) {
          return;
        }
        setState({
          color: dominant,
          error: null,
          hex: dominant?.hex() ?? null,
          status: "success",
        });
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        const normalized = error instanceof Error ? error : new Error(String(error));
        setState({
          color: null,
          error: normalized,
          hex: null,
          status: "error",
        });
      }
    })();

    return () => {
      ac.abort();
    };
  }, [url]);

  return state;
}
