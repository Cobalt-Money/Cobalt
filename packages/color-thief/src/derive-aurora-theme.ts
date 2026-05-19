/** Matches `original` preset in `@cobalt-web/ui` aurora themes when extraction fails. */
export const AURORA_FALLBACK_BACKGROUND = "#110026";
export const AURORA_FALLBACK_BORDER =
  "linear-gradient(90deg, rgba(140, 68, 36, 0.5) 0%, rgba(245, 62, 2, 0.4) 25%, rgba(255, 182, 0, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)";

function parseHex(hex: string): { b: number; g: number; r: number } | null {
  const t = hex.trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(t);
  if (!m?.[1] || !m[2] || !m[3]) {
    return null;
  }
  return {
    b: Number.parseInt(m[3], 16),
    g: Number.parseInt(m[2], 16),
    r: Number.parseInt(m[1], 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; l: number; s: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: {
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      }
      case gn: {
        h = (bn - rn) / d + 2;
        break;
      }
      default: {
        h = (rn - gn) / d + 4;
      }
    }
    h /= 6;
  }
  return { h: h * 360, l: l * 100, s: s * 100 };
}

export interface AuroraThemeStyle {
  background: string;
  border: string;
}

/**
 * Builds aurora-style background + border CSS from a sampled logo hex (e.g. Color Thief).
 * Falls back to the default “original” palette when `hex` is null or invalid.
 */
export function deriveAuroraThemeFromHex(hex: string | null): AuroraThemeStyle {
  if (!hex?.trim()) {
    return {
      background: AURORA_FALLBACK_BACKGROUND,
      border: AURORA_FALLBACK_BORDER,
    };
  }
  const rgb = parseHex(hex);
  if (!rgb) {
    return {
      background: AURORA_FALLBACK_BACKGROUND,
      border: AURORA_FALLBACK_BORDER,
    };
  }
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const sat = Math.min(55, Math.max(22, Math.round(s)));
  const background = `hsl(${Math.round(h)} ${sat}% 11%)`;
  const border = `linear-gradient(90deg, hsla(${Math.round(h)}, ${sat}%, 42%, 0.55) 0%, hsla(${Math.round(h)}, ${Math.min(sat + 12, 100)}%, 52%, 0.42) 25%, hsla(${Math.round(h)}, ${Math.min(sat + 22, 100)}%, 62%, 0.32) 50%, rgba(255, 255, 255, 0.55) 100%)`;
  return { background, border };
}
