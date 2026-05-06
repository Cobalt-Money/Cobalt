import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { cn } from "@cobalt-web/ui/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Solid Cobalt panel — matches `CobaltCommandDialog`, settings, and add-account.
 * Animation classes match the default `DialogContent` (zoom + fade) since the
 * `flex`/`overflow-hidden` overrides don't strip them via tailwind-merge.
 */
const COBALT_DIALOG_PANEL =
  "top-[max(6rem,13svh)] flex max-w-[calc(100vw-2rem)] translate-y-0 flex-col gap-0 overflow-hidden rounded-4xl border-0 bg-[oklch(0.949_0_0)] p-6 shadow-2xl ring-0 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-[oklch(0.29_0_0)]";

/** Lighter scrim than the default `bg-black/80` used app-wide. */
const COBALT_DIALOG_OVERLAY = "bg-black/60 supports-backdrop-filter:backdrop-blur-none";

export interface CobaltDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Optional override for the title styling (e.g. muted). */
  titleClassName?: string;
  /** Optional icon rendered before the title (Hugeicons SVG object). */
  titleIcon?: ComponentProps<typeof HugeiconsIcon>["icon"];
  /** Tailwind override for the title icon size/class. Defaults to `"size-6 shrink-0"`. */
  titleIconClassName?: string;
  description?: string;
  /** Tailwind width override (e.g. `"sm:max-w-md"`). Defaults to a 440px form-sized panel. */
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared Cobalt-styled form dialog. Matches `CobaltCommandDialog`, settings,
 * and add-account: same top offset, oklch panel, light scrim, no border. Use
 * for form modals (cash account, add transaction, etc.) so they all morph
 * into one another visually.
 */
export function CobaltDialog({
  open,
  onOpenChange,
  title,
  titleClassName,
  titleIcon,
  titleIconClassName,
  description,
  className,
  children,
  footer,
}: CobaltDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(COBALT_DIALOG_PANEL, "w-[440px] sm:max-w-md", className)}
        overlayClassName={COBALT_DIALOG_OVERLAY}
      >
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", titleClassName)}>
            {titleIcon ? (
              <HugeiconsIcon
                className={cn("size-6 shrink-0", titleIconClassName)}
                icon={titleIcon}
                strokeWidth={2}
              />
            ) : null}
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4 pt-4 pb-2">{children}</div>
        {footer ? <div className="mt-auto flex justify-end gap-2 pt-2">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
