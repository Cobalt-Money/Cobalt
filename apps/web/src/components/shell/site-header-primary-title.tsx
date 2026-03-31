import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

import { useTransactions } from "@/components/transactions/use-transactions";

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
      className="flex min-w-0 flex-1 items-center gap-1.5 text-base font-medium"
    >
      <Link
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        to="/transactions"
      >
        Transactions
      </Link>
      <HugeiconsIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
        icon={ArrowRight01Icon}
        strokeWidth={2}
      />
      <span className="min-w-0 truncate text-foreground">
        {label ?? <span className="text-muted-foreground">Loading…</span>}
      </span>
    </nav>
  );
}

/**
 * Shell header title area: default route title, or Linear-style breadcrumb on
 * `/transactions/:transactionId`.
 */
export function SiteHeaderPrimaryTitle() {
  const title = useShellRouteTitle();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const normalized = pathname.replace(/\/$/, "") || "/";
  const transactionId = /^\/transactions\/([^/]+)$/.exec(normalized)?.[1];

  if (transactionId) {
    return <TransactionDetailBreadcrumb transactionId={transactionId} />;
  }

  return <h1 className="text-base font-medium">{title}</h1>;
}
