import { Button } from "@cobalt-web/ui/components/button";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useDemo } from "@cobalt-web/ui/hooks/use-demo";
import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useDemoSeedProgress } from "./use-demo-seed-progress";
import type { DemoSeedPhase } from "./use-demo-seed-progress";

const PHASE_LABEL: Record<DemoSeedPhase, string> = {
  accounts: "Setting up accounts",
  chats: "Loading chat history",
  checking: "Preparing demo",
  done: "Demo ready",
  error: "Demo setup hit an error",
  holdings: "Loading holdings",
  investments: "Loading investments",
  skipped: "Demo ready",
  snapshots: "Building balance history",
  tags: "Setting up tags",
  transactions: "Populating transactions",
};

/**
 * Fixed top-of-viewport strip whenever the active session is anonymous (demo).
 *
 * The parent `<div data-demo-banner="1">` in `_auth/route.tsx` flags the
 * shell; CSS in globals.css uses that attribute to shift the sidebar +
 * sidebar-inset down by the banner's height.
 *
 * Seed-in-progress state is handled upstream by `DemoSeedLoader` — the app
 * shell (and therefore this banner) doesn't mount until the workflow's
 * terminal event fires, so the copy here is always the steady-state
 * "sample data" message.
 */
export function DemoBanner() {
  const { exit, isDemo, pending } = useDemo();
  const seedProgress = useDemoSeedProgress();

  if (!isDemo) {
    return null;
  }
  const seedingLabel =
    seedProgress.isRunning && seedProgress.phase ? PHASE_LABEL[seedProgress.phase] : null;

  return (
    <output className="fixed inset-x-0 top-0 z-50 flex h-9 shrink-0 items-center justify-center gap-3 border-b border-border bg-background px-4 text-sm text-foreground">
      <HugeiconsIcon className="text-chart-4" icon={MagicWand01Icon} size={16} strokeWidth={2} />
      <span>
        <span className="font-semibold">Demo mode</span>
        <span className="mx-2 text-muted-foreground">·</span>
        {seedingLabel ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-3" />
            {seedingLabel}…
          </span>
        ) : (
          "Sample data — connections, payments, and email are disabled."
        )}
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
    </output>
  );
}
