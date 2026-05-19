import { Button } from "@cobalt-web/ui/components/button";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useDemo } from "@cobalt-web/ui/hooks/use-demo";
import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Fixed top-of-viewport strip whenever the active session is anonymous (demo).
 *
 * The parent `<div data-demo-banner="1">` in `_auth/route.tsx` flags the
 * shell; CSS in globals.css uses that attribute to shift the sidebar +
 * sidebar-inset down by the banner's height.
 */
export function DemoBanner() {
  const { exit, isDemo, pending } = useDemo();

  if (!isDemo) {
    return null;
  }
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-9 shrink-0 items-center justify-center gap-3 border-b border-border bg-background px-4 text-sm text-foreground"
      role="status"
    >
      <HugeiconsIcon className="text-chart-4" icon={MagicWand01Icon} size={16} strokeWidth={2} />
      <span>
        <span className="font-semibold">Demo mode</span>
        <span className="mx-2 text-muted-foreground">·</span>
        Sample data — connections, payments, and email are disabled.
      </span>
      <Button
        disabled={pending}
        onClick={() => {
          void exit();
        }}
        size="xs"
        variant="outline"
      >
        {pending ? <Spinner className="size-3" /> : null}
        {pending ? "Exiting…" : "Exit demo"}
      </Button>
    </div>
  );
}
