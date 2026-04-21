import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { getTransactionDisplayName } from "@cobalt-web/ui/cobalt/transactions/lib/helpers";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { parseISO, format } from "date-fns";

import { ConnectAccountEmpty } from "@/components/empty/connect-account-empty";
import { useTransactions } from "@/hooks/use-transactions";

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);

export function DashboardRecentTransactionsCard() {
  const { items } = useTransactions();
  const rows = items.slice(0, 6);

  return (
    <section aria-label="Recent transactions" className="h-full min-w-0 w-full">
      <CobaltCard className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground text-lg font-medium">
            Recent transactions
          </h2>

          {rows.length === 0 ? (
            <ConnectAccountEmpty
              className="min-h-[220px] border-0"
              description="Connect a bank to see your recent spending and income."
              title="No transactions yet"
            />
          ) : null}

          <ul className="flex flex-col gap-0">
            {rows.map((tx) => {
              const isInflow = tx.amount > 0;
              const displayName = getTransactionDisplayName(tx);
              const dateLabel = format(parseISO(tx.date), "MMM d");
              return (
                <li
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                  key={tx.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <MerchantLogo
                      className="size-10 shrink-0"
                      counterparties={null}
                      deferUntilVisible={false}
                      logoUrl={tx.logoUrl ?? null}
                      merchantName={displayName}
                      website={tx.website ?? null}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-medium">
                        {displayName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {dateLabel}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-base font-semibold tabular-nums",
                      isInflow ? "text-green-550" : "text-foreground"
                    )}
                  >
                    <PrivateAmount>
                      {isInflow ? "+" : ""}
                      {formatUsd(tx.amount)}
                    </PrivateAmount>
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </CobaltCard>
    </section>
  );
}
