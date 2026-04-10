import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { buttonVariants } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

import { useTransactions } from "@/hooks/use-transactions";

import { useAmbientInset } from "./ambient-inset-context";
import { useShellRouteTitle } from "./header/use-shell-route-title";

function TransactionDetailBreadcrumb({
  transactionId,
}: {
  transactionId: string;
}) {
  const { items } = useTransactions();
  const transaction = useMemo(
    () => items.find((t) => t.id === transactionId),
    [items, transactionId]
  );
  const label =
    transaction?.merchantName?.trim() || transaction?.name?.trim() || null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-1 items-center gap-1.5 text-lg font-medium leading-tight tracking-tight sm:text-xl"
    >
      <Link
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        to="/transactions"
      >
        Transactions
      </Link>
      <HugeiconsIcon
        aria-hidden
        className="size-[1.125rem] shrink-0 text-muted-foreground sm:size-5"
        icon={ArrowRight01Icon}
        strokeWidth={2}
      />
      <span className="min-w-0 truncate text-foreground">
        {label ?? <span className="text-muted-foreground">Loading…</span>}
      </span>
    </nav>
  );
}

/** Back control + logo + symbol / company (replaces plain “Ticker” title). */
function ResearchTickerHeader({ symbol }: { symbol: string }) {
  const { tickerCompanyName } = useAmbientInset();
  const sym = symbol.trim().toUpperCase();

  return (
    <nav
      aria-label="Research ticker"
      className="flex min-h-0 min-w-0 flex-1 items-center gap-2 self-stretch py-px sm:gap-2.5"
    >
      <Link
        aria-label="Back to research"
        className={cn(
          buttonVariants({ size: "icon-lg", variant: "ghost" }),
          "shrink-0 -ml-1"
        )}
        to="/research"
      >
        <HugeiconsIcon
          className="size-7"
          icon={ArrowLeft01Icon}
          strokeWidth={2}
        />
      </Link>
      <TickerLogo size={28} symbol={sym} />
      <div className="flex min-w-0 flex-1 flex-nowrap items-baseline gap-2 sm:gap-2.5">
        <span className="shrink-0 font-semibold text-lg leading-tight tracking-tight sm:text-xl">
          {sym}
        </span>
        {tickerCompanyName ? (
          <span className="min-w-0 truncate text-muted-foreground text-sm leading-tight sm:text-base">
            {tickerCompanyName}
          </span>
        ) : null}
      </div>
    </nav>
  );
}

/**
 * Shell header title area: default route title, or Linear-style breadcrumb on
 * `/transactions/:transactionId`, or ticker chrome on `/research/:symbol`.
 */
export function SiteHeaderPrimaryTitle() {
  const title = useShellRouteTitle();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const normalized = pathname.replace(/\/$/, "") || "/";
  const transactionId = /^\/transactions\/([^/]+)$/.exec(normalized)?.[1];
  const researchSymbol = /^\/research\/([^/]+)$/.exec(normalized)?.[1];

  if (transactionId) {
    return <TransactionDetailBreadcrumb transactionId={transactionId} />;
  }

  if (researchSymbol) {
    return <ResearchTickerHeader symbol={researchSymbol} />;
  }

  return (
    <div className="flex min-w-0 flex-1 items-center self-stretch">
      <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
        {title}
      </h1>
    </div>
  );
}
