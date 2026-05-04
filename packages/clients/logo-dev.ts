/**
 * Logo.dev image CDN — {@link https://www.logo.dev/docs}
 * Use a publishable key from the dashboard; pass it as `token` on every URL.
 */

const LOGO_DEV_IMG_ORIGIN = "https://img.logo.dev" as const;

export interface LogoDevImageOptions {
  token: string;
  /** Width/height in px (image keeps aspect ratio). Default on Logo.dev is 128. */
  size?: number;
  format?: "jpg" | "png" | "webp";
  /** Optimize colors for light or dark UI backgrounds. */
  theme?: "dark" | "light";
}

function appendLogoDevSearchParams(url: URL, options: LogoDevImageOptions): void {
  url.searchParams.set("token", options.token);
  if (options.size !== undefined) {
    url.searchParams.set("size", String(options.size));
  }
  if (options.format) {
    url.searchParams.set("format", options.format);
  }
  if (options.theme) {
    url.searchParams.set("theme", options.theme);
  }
}

function assertNonEmpty(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label}: value is required`);
  }
  return trimmed;
}

/**
 * Logo for a verified domain (e.g. `nike.com`, `www.amazon.com` stripped to host in your mapper).
 * @see https://www.logo.dev/docs/logo-images/get
 */
export function logoDevUrlByDomain(domain: string, options: LogoDevImageOptions): string {
  const host = assertNonEmpty("logoDevUrlByDomain", domain);
  const url = new URL(`${LOGO_DEV_IMG_ORIGIN}/${host}`);
  appendLogoDevSearchParams(url, options);
  return url.toString();
}

/**
 * Logo by brand display name (Logo.dev runs brand search and uses the best match).
 * URL-encodes the name for the path segment.
 * @see https://www.logo.dev/docs/logo-images/name
 */
export function logoDevUrlByBrandName(brandName: string, options: LogoDevImageOptions): string {
  const name = assertNonEmpty("logoDevUrlByBrandName", brandName);
  const url = new URL(`${LOGO_DEV_IMG_ORIGIN}/name/${encodeURIComponent(name)}`);
  appendLogoDevSearchParams(url, options);
  return url.toString();
}
