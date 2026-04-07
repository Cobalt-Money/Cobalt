import {
  deriveAuroraThemeFromHex,
  useDominantColor,
} from "@cobalt-web/color-thief";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, type ReactNode } from "react";

import { AuroraCardFrame } from "./aurora-card-frame";

export type InstitutionAuroraCardProps = {
  children: ReactNode;
  className?: string;
  /** HTTP(S) logo URL sampled with Color Thief (`crossOrigin=anonymous`). */
  logoUrl: string | null;
};

/**
 * Aurora glass card whose background + border are derived from the institution logo
 * dominant color (via `@cobalt-web/color-thief`). Falls back to the “original” preset
 * when no URL, CORS blocks sampling, or extraction fails.
 */
export function InstitutionAuroraCard({
  children,
  className,
  logoUrl,
}: InstitutionAuroraCardProps) {
  const { hex } = useDominantColor(logoUrl);
  const theme = useMemo(() => deriveAuroraThemeFromHex(hex), [hex]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl transition-colors duration-700",
        className
      )}
      style={{ background: theme.background }}
    >
      <AuroraCardFrame borderGradient={theme.border}>
        {children}
      </AuroraCardFrame>
    </div>
  );
}
