"use client";

import {
  brandfetchTickerIconUrls,
  normalizeTickerForBrandfetch,
} from "@cobalt-web/clients/brandfetch";
import { useMemo } from "react";

import { LogoImageWithFallback } from "./logo-image-fallback";

export interface TickerLogoCDNProps {
  /** Raw symbol from holdings or activity (trimmed / normalized internally). */
  symbol: string;
  clientId: string;
  /** Letter(s) when Logo API returns nothing usable. */
  fallbackText: string;
  /** @default "Logo by Brandfetch" */
  alt?: string;
  /** Square edge length for Logo API `w`/`h` (default 128). */
  logoApiSize?: number;
  className?: string;
  imgClassName?: string;
}

/**
 * Circular-friendly ticker glyph: Brandfetch **`ticker/`** CDN (`icon` → lettermark fallback),
 * same pattern as {@link LogoCDN} but for exchange symbols instead of domains.
 */
export function TickerLogoCDN({
  symbol,
  clientId,
  fallbackText,
  alt = "Logo by Brandfetch",
  logoApiSize = 128,
  className,
  imgClassName = "object-cover",
}: TickerLogoCDNProps) {
  const candidates = useMemo(() => {
    const t = normalizeTickerForBrandfetch(symbol);
    if (!t || !clientId.trim()) {
      return [];
    }
    return brandfetchTickerIconUrls(
      t,
      clientId,
      logoApiSize === 128 ? undefined : { size: logoApiSize }
    );
  }, [clientId, logoApiSize, symbol]);

  return (
    <LogoImageWithFallback
      alt={alt}
      candidates={candidates}
      className={className}
      fallbackText={fallbackText}
      imgClassName={imgClassName}
    />
  );
}
