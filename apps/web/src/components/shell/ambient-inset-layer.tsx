import { useTheme } from "next-themes";

import { useAmbientInset } from "@/components/shell/ambient-inset-context";
import { ambientMeshStyle } from "@/components/shell/ambient-mesh";

/**
 * Full-bleed mesh inside {@link SidebarInset} (header + scroll area).
 * Active only when a ticker route registers a symbol via {@link useAmbientInset}.
 */
export function AmbientInsetLayer() {
  const { resolvedTheme } = useTheme();
  const { dominantHex, insetSymbol } = useAmbientInset();

  if (!insetSymbol) {
    return null;
  }

  const mode = resolvedTheme === "light" ? "light" : "dark";
  const style = ambientMeshStyle(dominantHex, insetSymbol, mode);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-t-xl"
      style={style}
    />
  );
}
