import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

interface SelectionActionBarProps {
  count: number;
  onClear: () => void;
  onOpenActions: () => void;
  className?: string;
}

const EXIT_MS = 100;

/**
 * Floating bottom-center pill shown when rows are selected. Two segments:
 * `N selected` + clear button, divider, `⌘ Actions` button.
 * Esc clears selection (when no other modal is focused).
 * Slides up + fades on enter; reverses on exit. Stays mounted briefly during
 * exit so the transition can play before unmount.
 */
export function SelectionActionBar({
  count,
  onClear,
  onOpenActions,
  className,
}: SelectionActionBarProps) {
  const visible = count > 0;
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);
  // Capture last non-zero count so exit animation shows the prior label
  // instead of flashing "0 selected" while the bar slides away.
  const lastCount = useRef(count);
  if (count > 0) {
    lastCount.current = count;
  }
  const displayCount = count > 0 ? count : lastCount.current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setShown(true);
      return;
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClear();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClear, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      data-state={shown ? "open" : "closed"}
      className={cn(
        "-translate-x-1/2 fixed bottom-6 left-1/2 z-50 flex items-center gap-1 rounded-full bg-[oklch(0.949_0_0)] p-1 text-foreground text-sm shadow-lg ring-1 ring-foreground/5 duration-100 dark:bg-[oklch(0.29_0_0)]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
    >
      <div className="px-3 py-1 text-muted-foreground">
        <span className="font-medium">{displayCount} selected</span>
      </div>
      <button
        aria-label="Clear selection"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-input/40 hover:text-foreground"
        onClick={onClear}
        type="button"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
      </button>
      <div className="h-5 w-px bg-foreground/10" aria-hidden />
      <button
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-foreground transition-colors hover:bg-input/40"
        onClick={onOpenActions}
        type="button"
      >
        <KbdGroup className="pointer-events-none gap-0.5">
          <Kbd className="min-w-5 px-1">⌘</Kbd>
        </KbdGroup>
        <span className="font-medium">Actions</span>
      </button>
    </div>
  );
}
