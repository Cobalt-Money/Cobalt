import type { CSSProperties } from "react";

export type AmbientMode = "dark" | "light";

export function hexToRgb(
  hex: string
): { b: number; g: number; r: number } | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m?.[1] || !m[2] || !m[3]) {
    return null;
  }
  return {
    b: Number.parseInt(m[3], 16),
    g: Number.parseInt(m[2], 16),
    r: Number.parseInt(m[1], 16),
  };
}

/** Stable hue 0–359 from ticker symbol (when logo color is unavailable). */
export function symbolHue(symbol: string): number {
  let h = 0;
  for (const c of symbol) {
    h = (h + (c.codePointAt(0) ?? 0)) * 17;
  }
  return Math.abs(h) % 360;
}

/**
 * Bottom-heavy wash: saturated brand at the bottom fading into the inset surface
 * (`--sidebar-inset`, same as `SidebarInset`’s `bg-sidebar-inset`) — not a
 * different token than the shell.
 */
export function ambientMeshStyle(
  dominantHex: string | null,
  symbol: string,
  mode: AmbientMode
): CSSProperties {
  const rgb = dominantHex ? hexToRgb(dominantHex) : null;
  const hue = symbolHue(symbol);

  if (mode === "light") {
    /* Wash spans bottom ~90% of the inset; top ~10% stays plain surface. */
    const wash = rgb
      ? `linear-gradient(0deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.13) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.04) 47%, rgba(${rgb.r},${rgb.g},${rgb.b},0) 90%)`
      : `linear-gradient(0deg, hsla(${hue}, 55%, 72%, 0.12) 0%, hsla(${hue}, 40%, 88%, 0.04) 58%, hsla(${hue}, 30%, 96%, 0) 90%)`;

    return {
      backgroundColor: "var(--sidebar-inset)",
      backgroundImage: wash,
    };
  }

  /*
   * Radial from bottom (not a tall linear-gradient): long vertical linears are a
   * common source of “corduroy” / vertical banding on some GPUs.
   */
  const wash = rgb
    ? `radial-gradient(ellipse 130% 85% at 50% 100%, rgba(${rgb.r},${rgb.g},${rgb.b},0.28) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.14) 38%, rgba(${rgb.r},${rgb.g},${rgb.b},0.05) 58%, rgba(${rgb.r},${rgb.g},${rgb.b},0) 78%)`
    : `radial-gradient(ellipse 130% 85% at 50% 100%, hsla(${hue}, 58%, 44%, 0.26) 0%, hsla(${hue}, 50%, 36%, 0.12) 40%, hsla(${hue}, 40%, 24%, 0.05) 58%, hsla(${hue}, 30%, 14%, 0) 78%)`;

  return {
    backgroundColor: "var(--sidebar-inset)",
    backgroundImage: wash,
  };
}
