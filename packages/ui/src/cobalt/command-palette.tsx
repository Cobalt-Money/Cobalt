import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@cobalt-web/ui/components/button";
import { Command } from "@cobalt-web/ui/components/command";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Command as CommandPrimitive } from "cmdk";
import type { ComponentProps } from "react";

/** Same merge as `DialogContent` + stock `CommandDialog` `className` (no `bg-background`; glass below). */
function cobaltCommandDialogPopupClassNames() {
  return cn(
    /* Below app chrome, clearly above vertical center (not `top-1/2` / mid-screen). */
    "fixed top-[max(6rem,13svh)] left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 translate-y-0 flex-col overflow-hidden rounded-3xl! p-0 text-sm duration-100 outline-none",
    "max-h-[min(55vh,35rem)] sm:max-w-2xl",
    "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
  );
}

/** Solid panel with oklch colors. */
const cobaltCommandDialogContentClassName =
  "bg-[oklch(0.949_0_0)] shadow-2xl dark:bg-[oklch(0.29_0_0)]";

/** Lighter scrim than default `DialogOverlay` (`bg-black/80`). */
const cobaltCommandDialogOverlayClassName =
  "bg-black/25 supports-backdrop-filter:backdrop-blur-none";

type CobaltCommandDialogProps = Omit<
  ComponentProps<typeof Dialog>,
  "children"
> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
};

/**
 * Command palette modal: composes base `Dialog` + `DialogPortal` + `DialogOverlay` + Base UI `Popup`
 * so product glass/scrim stay out of `components/dialog.tsx` and `components/command.tsx`.
 */
function CobaltCommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: CobaltCommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogPortal>
        <DialogOverlay className={cobaltCommandDialogOverlayClassName} />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            cobaltCommandDialogPopupClassNames(),
            cobaltCommandDialogContentClassName,
            className
          )}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4"
                  size="icon-sm"
                />
              }
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

/**
 * cmdk root styled for the Cobalt command palette (Linear / Mobbin-style shell).
 * Use inside {@link CobaltCommandDialog} with {@link CobaltCommandInput}, {@link CommandList}, etc.
 */
function CobaltCommandPaletteRoot({
  className,
  ...props
}: ComponentProps<typeof Command>) {
  return (
    <Command
      className={cn(
        "gap-0 border-0 bg-transparent p-0 px-2 shadow-none rounded-none",
        /* Command list matching dialog height */
        "[&_[data-slot=command-list]]:!max-h-[min(45vh,28rem)] [&_[data-slot=command-list]]:pb-2",
        /* Hide native scrollbar chrome while keeping overflow scroll. */
        "[&_[data-slot=command-list]]:[scrollbar-width:none] [&_[data-slot=command-list]::-webkit-scrollbar]:hidden",
        "[&_[cmdk-group]]:!p-0 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
        "[&_[cmdk-group-heading]]:!px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        /* Light: `bg-muted` is ~white — use a visible tint; dark keeps token `muted`. */
        "[&_[cmdk-item][aria-selected='true']]:!bg-black/[0.09] dark:[&_[cmdk-item][aria-selected='true']]:!bg-muted",
        /* Base `CommandItem` uses `rounded-2xl` in dialog — minimal corner radius. */
        "[&_[cmdk-item]]:!rounded-lg",
        "[&_[cmdk-item]]:!px-4 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
        "[&_[cmdk-empty]]:!px-4",
        className
      )}
      {...props}
    />
  );
}

/**
 * Frameless search field: no icon, no rounded input chrome. Use inside
 * {@link CobaltCommandPaletteRoot} instead of the base {@link CommandInput}.
 */
function CobaltCommandInput({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="cobalt-command-input-wrapper" className="px-4 py-5">
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "w-full border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

export { CobaltCommandDialog, CobaltCommandInput, CobaltCommandPaletteRoot };
export type { CobaltCommandDialogProps };
