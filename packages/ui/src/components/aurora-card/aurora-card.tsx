import { cn } from "@cobalt-web/ui/lib/utils";
import { useState } from "react";
import type { ReactNode } from "react";

import { AuroraCardFrame } from "./aurora-card-frame";
import { AuroraThemePicker } from "./aurora-theme-picker";
import { AURORA_THEME_PRESETS } from "./aurora-theme-presets";
import type { AuroraThemePreset } from "./aurora-theme-presets";

const DEFAULT_THEME = AURORA_THEME_PRESETS[0]!;

export interface AuroraCardProps {
  /** Optional demo content inside the glass card. */
  children?: ReactNode;
  className?: string;
  /** Show preset theme picker (demo / docs). @default false */
  showThemePicker?: boolean;
}

/**
 * Full-screen–style aurora demo: optional theme picker + glass frame.
 * For production account surfaces, prefer `InstitutionAuroraCard`.
 */
export function AuroraCard({
  children,
  className,
  showThemePicker = false,
}: AuroraCardProps) {
  const [currentTheme, setCurrentTheme] =
    useState<AuroraThemePreset>(DEFAULT_THEME);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-8 p-8 transition-colors duration-700",
        className
      )}
      style={{ background: currentTheme.background }}
    >
      {showThemePicker ? (
        <AuroraThemePicker
          currentId={currentTheme.id}
          themes={AURORA_THEME_PRESETS}
          onSelect={setCurrentTheme}
        />
      ) : null}

      <div className="w-full max-w-[660px]">
        <AuroraCardFrame
          accent={
            <div className="flex">
              <div className="size-[70px] rounded-full bg-[#FF4F38]" />
              <div className="-ml-[35px] size-[70px] rounded-full bg-[#FFB600]" />
            </div>
          }
          borderGradient={currentTheme.border}
        >
          {children ?? (
            <>
              <div className="flex justify-between gap-8 pb-8">
                <h2 className="font-sans text-[20px] leading-5 font-semibold text-[#F1F1F1]">
                  KAIN XU
                </h2>
                <p className="font-sans text-[20px] leading-5 font-semibold text-[#F1F1F1]">
                  01/27
                </p>
              </div>
              <p className="font-sans text-[32px] leading-8 font-semibold tracking-[0.15em] text-[#F1F1F1]">
                1225 0127 0228 3698
              </p>
            </>
          )}
        </AuroraCardFrame>
      </div>
    </div>
  );
}
