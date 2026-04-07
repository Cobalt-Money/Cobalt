import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";

import type { AuroraThemePreset } from "./aurora-theme-presets";

export type AuroraThemePickerProps = {
  className?: string;
  currentId: string;
  onSelect: (theme: AuroraThemePreset) => void;
  themes: readonly AuroraThemePreset[];
};

/** Circular preset swatches (Base UI `Button`). */
export function AuroraThemePicker({
  className,
  currentId,
  onSelect,
  themes,
}: AuroraThemePickerProps) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-3", className)}>
      {themes.map((theme) => (
        <Button
          key={theme.id}
          type="button"
          variant="ghost"
          size="icon"
          title={theme.name}
          aria-label={`Theme ${theme.name}`}
          aria-pressed={currentId === theme.id}
          className={cn(
            "h-12 w-12 min-w-12 rounded-full border-0 p-0 transition-transform duration-300 hover:scale-110",
            "focus-visible:ring-2 focus-visible:ring-white/50",
            currentId === theme.id && "scale-110 ring-2 ring-white/80"
          )}
          style={{ background: theme.background }}
          onClick={() => {
            onSelect(theme);
          }}
        />
      ))}
    </div>
  );
}
