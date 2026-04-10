import { useTheme } from "next-themes";

import { useAmbientInset } from "@/components/shell/ambient-inset-context";
import { ambientMeshStyle } from "@/components/shell/ambient-mesh";

/**
 * Full-bleed mesh inside {@link SidebarInset} (header + scroll area).
 * Active only when a ticker route registers a symbol via {@link useAmbientInset}.
 *
 * No horizontal `mask-image` / inset shadow on the wash: both vary along X and can
 * show as faint vertical bands (8‑bit quantization). Edge vs. sidebar is a shell seam.
 */
export function AmbientInsetLayer() {
  const { resolvedTheme } = useTheme();
  const { dominantHex, insetSymbol } = useAmbientInset();

  if (!insetSymbol) {
    return null;
  }

  const mode = resolvedTheme === "light" ? "light" : "dark";
  const mesh = ambientMeshStyle(dominantHex, insetSymbol, mode);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-t-xl"
      style={mesh}
    />
  );
}
