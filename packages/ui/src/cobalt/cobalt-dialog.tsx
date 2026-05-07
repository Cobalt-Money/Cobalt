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
  /** Tailwind width override (e.g. `"sm:max-w-lg"`). Defaults to a 440px form-sized panel. */
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Form-shaped dialog: `title + icon`, optional description, body slot, optional
 * footer (right-aligned actions). Visual chrome (top-anchored, light scrim,
 * subtle popover bg, shadow-2xl) is inherited from base `DialogContent` — no
 * className overrides here.
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
      <DialogContent className={cn("w-[440px] sm:max-w-md", className)}>
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
