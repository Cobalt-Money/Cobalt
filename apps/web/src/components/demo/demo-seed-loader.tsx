import { Progress } from "@cobalt-web/ui/components/progress";

import { TextSwap } from "@/components/text-swap";

import type { DemoSeedPhase } from "./use-demo-seed-progress";

/**
 * Ordered list of phases used to render the progress bar. Terminal phases
 * (`done`, `skipped`, `error`) intentionally omitted — the loader unmounts
 * before they matter.
 */
const PHASE_ORDER: DemoSeedPhase[] = [
  "checking",
  "accounts",
  "tags",
  "transactions",
  "holdings",
  "snapshots",
  "investments",
  "chats",
];

const PHASE_LABEL: Record<DemoSeedPhase, string> = {
  accounts: "Setting up accounts",
  chats: "Seeding chat history",
  checking: "Preparing your demo",
  done: "Ready",
  error: "Something went wrong",
  holdings: "Seeding holdings",
  investments: "Seeding investment activity",
  skipped: "Ready",
  snapshots: "Building balance history",
  tags: "Setting up tags",
  transactions: "Populating transactions",
};

interface DemoSeedLoaderProps {
  phase: DemoSeedPhase | null;
}

/**
 * Full-screen loader shown while the demo-seed workflow is still populating
 * PlanetScale (and, downstream, Zero's replica). Gated by `_auth/route.tsx`
 * so it replaces the app shell entirely for the freshly-created demo user
 * until the workflow emits a terminal event. Avoids the "half-populated
 * dashboard" flash while Zero live queries trickle in row-by-row.
 */
export function DemoSeedLoader({ phase }: DemoSeedLoaderProps) {
  const currentIdx = phase ? PHASE_ORDER.indexOf(phase) : -1;
  const progressPct =
    currentIdx >= 0 ? Math.round(((currentIdx + 1) / PHASE_ORDER.length) * 100) : 5;
  const label = phase ? PHASE_LABEL[phase] : PHASE_LABEL.checking;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-6">
      <h1 className="font-semibold text-2xl text-foreground">
        <TextSwap value={`${label}…`} />
      </h1>

      <Progress className="h-2 w-full max-w-md" value={progressPct} />
    </div>
  );
}
