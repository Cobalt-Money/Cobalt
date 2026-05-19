import { brandfetchIconDomainUrls } from "@cobalt-web/clients/brandfetch";
import { useMemo } from "react";

import { LogoImageWithFallback } from "./logo-image-fallback";

export interface LogoCDNProps {
  /** Hostname only (e.g. `github.com`). */
  domain: string;
  clientId: string;
  /** Initial letter when Logo API returns nothing usable (matches lettermark-style fallback). */
  fallbackText: string;
  /** @default "Logo by Brandfetch" */
  alt?: string;
  /** Square edge length for Logo API assets (default 128). */
  logoApiSize?: number;
  className?: string;
  imgClassName?: string;
}

/**
 * Brandfetch Logo API with the [LogoCDN pattern](https://docs.brandfetch.com/guides/customize-logo-api-fallback):
 * `domain` + `clientId` + `fallbackText`, with the same multi-URL chain as the rest of the app
 * (`type=icon` → lettermark) before local `fallbackText`.
 *
 * @example
 * ```tsx
 * <LogoCDN domain="github.com" clientId={id} fallbackText="G" />
 * ```
 */
export function LogoCDN({
  domain,
  clientId,
  fallbackText,
  alt = "Logo by Brandfetch",
  logoApiSize = 128,
  className,
  imgClassName = "object-cover",
}: LogoCDNProps) {
  const candidates = useMemo(
    () =>
      domain.trim()
        ? brandfetchIconDomainUrls(
            domain.trim(),
            clientId,
            logoApiSize === 128 ? undefined : { size: logoApiSize },
          )
        : [],
    [clientId, domain, logoApiSize],
  );

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
