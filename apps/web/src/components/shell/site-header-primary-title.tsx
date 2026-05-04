import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { getTransactionDisplayName } from "@cobalt-web/ui/cobalt/transactions/lib/helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cobalt-web/ui/components/alert-dialog";
import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { cn } from "@cobalt-web/ui/lib/utils";
import { mutators, queries } from "@cobalt-web/zero";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Link } from "@/components/links";
import { useFinancialEventDetail } from "@/hooks/use-financial-event-detail";
import { useTransactions } from "@/hooks/use-transactions";

import { useAmbientInset } from "./ambient-inset-context";
import { useShellRouteTitle } from "./header/use-shell-route-title";

function TransactionDetailBreadcrumb({ transactionId }: { transactionId: string }) {
  const { items } = useTransactions();
  const zero = useZero();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const transaction = useMemo(
    () => items.find((t) => t.id === transactionId),
    [items, transactionId],
  );
  const label = transaction ? getTransactionDisplayName(transaction) : null;
  const canDelete = transaction?.source === "manual";

  const handleDelete = () => {
    const { server } = zero.mutate(mutators.transaction.deleteTransaction({ id: transactionId }));
    cobaltToast.transactionDeleted();
    navigate({ replace: true, to: "/transactions" });
    void (async () => {
      try {
        await server;
      } catch (error) {
        console.error("Failed to delete transaction", error);
        cobaltToast.error("Couldn't delete transaction. Please try again.");
      }
    })();
  };

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
      {canDelete ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Transaction options"
                  className="ml-1 shrink-0"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-5" icon={Settings01Icon} strokeWidth={2} />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setConfirmOpen(true)} variant="destructive">
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete transaction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the transaction. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </nav>
  );
}

/** Back control + logo + symbol / company (replaces plain “Ticker” title). */
function ResearchTickerHeader({ symbol }: { symbol: string }) {
  const { tickerCompanyName } = useAmbientInset();
  const sym = symbol.trim().toUpperCase();

  return (
    <nav aria-label="Research ticker" className="flex min-h-0 min-w-0 flex-1 self-stretch">
      <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-2 sm:gap-2.5">
        <Link
          aria-label="Back to research"
          className={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }), "shrink-0 -ml-1")}
          to="/research"
        >
          <HugeiconsIcon className="size-6" icon={ArrowLeft01Icon} strokeWidth={2} />
        </Link>
        <TickerLogo size={28} symbol={sym} />
        <div className="flex min-w-0 items-baseline gap-2 sm:gap-2.5">
          <span className="shrink-0 font-semibold text-lg leading-none tracking-tight sm:text-xl">
            {sym}
          </span>
          {tickerCompanyName ? (
            <span className="min-w-0 truncate text-muted-foreground text-sm leading-none sm:text-base">
              {tickerCompanyName}
            </span>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function AiChatThreadTitle({ chatId }: { chatId: string }) {
  const [rows] = useQuery(queries.chats.chatById({ chatId }));
  const [row] = rows;
  const label = typeof row?.title === "string" ? row.title.trim() : "";
  const headline: ReactNode = label && label.length > 0 ? label : "Chat";

  return (
    <div className="flex min-w-0 flex-1 items-center self-stretch">
      <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
        {headline}
      </h1>
    </div>
  );
}

function NewsEventBreadcrumb({ eventId }: { eventId: string }) {
  const { event } = useFinancialEventDetail(eventId);
  const label = typeof event?.eventName === "string" ? event.eventName.trim() : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-1 items-center gap-1.5 text-lg font-medium leading-tight tracking-tight sm:text-xl"
    >
      <Link
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        to="/news"
      >
        News
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
  const aiChatId = /^\/ai-chat\/([^/]+)$/.exec(normalized)?.[1];
  const newsEventId = /^\/news\/([^/]+)$/.exec(normalized)?.[1];

  if (transactionId) {
    return <TransactionDetailBreadcrumb transactionId={transactionId} />;
  }

  if (researchSymbol) {
    return <ResearchTickerHeader symbol={researchSymbol} />;
  }

  if (aiChatId) {
    return <AiChatThreadTitle chatId={aiChatId} />;
  }

  if (newsEventId) {
    return <NewsEventBreadcrumb eventId={newsEventId} />;
  }

  return (
    <div className="flex min-w-0 flex-1 items-center self-stretch">
      <h1 className="min-w-0 truncate text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
        {title}
      </h1>
    </div>
  );
}
