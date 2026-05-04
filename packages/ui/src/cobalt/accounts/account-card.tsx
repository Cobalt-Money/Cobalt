import { Card, CardContent, CardFooter } from "@cobalt-web/ui/components/card";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { AccountConnectionActions } from "./account-connection-actions";
import { formatLastSyncedLabel, formatLastSyncedTitle } from "./lib/format-last-synced";
import type { AccountCardViewModel } from "./lib/map-zero-to-account-cards";

/** Ghost-style panel: soft fill, no stroke/shadow; compact padding; actions pinned to bottom. */
export function AccountCard({
  account,
  institutionLogo,
}: {
  account: AccountCardViewModel;
  /** App-provided institution mark (logo component or image). */
  institutionLogo: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "flex min-h-[200px] flex-col gap-0 border-0 bg-[oklch(0.949_0_0)] py-0 shadow-none ring-0",
        "rounded-2xl sm:min-h-[220px] sm:rounded-3xl",
        "dark:bg-white/[0.06]",
      )}
    >
      <CardContent className="flex flex-1 flex-col px-5 pt-4 pb-0 sm:px-6 sm:pt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            className="min-w-0 max-w-[min(100%,calc(100%-3.5rem))] text-base font-semibold tracking-tight text-foreground sm:text-lg"
            title={account.description}
          >
            {account.description}
          </h3>
          {institutionLogo}
        </div>
        <p className="mt-1 text-sm font-medium leading-snug text-muted-foreground">
          {account.accountTypeLabel}
        </p>
        <p
          aria-label={`Account ending in ${account.mask}`}
          className="mt-4 flex flex-wrap items-baseline gap-x-2 text-lg font-semibold leading-snug tabular-nums tracking-tight sm:mt-5 sm:text-xl"
          title={`Ending in ${account.mask}`}
        >
          <span aria-hidden className="select-none font-mono tracking-widest text-muted-foreground">
            **** **** ****
          </span>
          <span className="font-bold tracking-normal text-foreground tabular-nums">
            {account.mask}
          </span>
        </p>
      </CardContent>
      <CardFooter
        className={cn(
          "mt-auto flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 ",
          "px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1">
          <AccountConnectionActions account={account} />
        </div>
        <p
          aria-label={
            account.lastSyncedAt === null
              ? "Never synced"
              : `Last synced ${formatLastSyncedLabel(account.lastSyncedAt)}`
          }
          className="flex shrink-0 items-center justify-end gap-1.5 text-right text-sm font-normal text-muted-foreground"
        >
          <HugeiconsIcon
            aria-hidden
            className="size-6 shrink-0 text-muted-foreground"
            icon={ArrowReloadHorizontalIcon}
            strokeWidth={2}
          />
          {account.lastSyncedAt === null ? (
            <span className="tabular-nums">—</span>
          ) : (
            <time
              className="tabular-nums"
              dateTime={new Date(account.lastSyncedAt).toISOString()}
              title={formatLastSyncedTitle(account.lastSyncedAt)}
            >
              {formatLastSyncedLabel(account.lastSyncedAt)}
            </time>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
