import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { cn } from "@cobalt-web/ui/lib/utils";

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);

/** Demo rows — replace with live data later. */
const DEMO_TRANSACTIONS = [
  {
    amount: -15.99,
    date: "Apr 8",
    id: "1",
    logoUrl: "https://logo.clearbit.com/netflix.com",
    name: "Netflix",
    website: "https://www.netflix.com",
  },
  {
    amount: -47.32,
    date: "Apr 7",
    id: "2",
    logoUrl: "https://logo.clearbit.com/wholefoodsmarket.com",
    name: "Whole Foods Market",
    website: "https://www.wholefoodsmarket.com",
  },
  {
    amount: 4250,
    date: "Apr 5",
    id: "3",
    logoUrl: "https://logo.clearbit.com/gusto.com",
    name: "Acme Payroll",
    website: "https://www.gusto.com",
  },
  {
    amount: -62,
    date: "Apr 4",
    id: "4",
    logoUrl: "https://logo.clearbit.com/shell.com",
    name: "Shell",
    website: "https://www.shell.com",
  },
  {
    amount: -128.45,
    date: "Apr 2",
    id: "5",
    logoUrl: "https://logo.clearbit.com/coned.com",
    name: "City Utilities",
    website: "https://www.coned.com",
  },
  {
    amount: -6.75,
    date: "Apr 1",
    id: "6",
    logoUrl: "https://logo.clearbit.com/starbucks.com",
    name: "Starbucks",
    website: "https://www.starbucks.com",
  },
] as const;

export function DashboardRecentTransactionsCard() {
  return (
    <section aria-label="Recent transactions" className="h-full min-w-0 w-full">
      <CobaltCard className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl py-4">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 px-5 pb-4 sm:px-6">
          <h2 className="text-foreground text-lg font-medium">
            Recent transactions
          </h2>

          <ul className="flex flex-col gap-0">
            {DEMO_TRANSACTIONS.map((tx) => {
              const isInflow = tx.amount > 0;
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
                      logoUrl={tx.logoUrl}
                      merchantName={tx.name}
                      website={tx.website}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-medium">
                        {tx.name}
                      </p>
                      <p className="text-muted-foreground text-sm">{tx.date}</p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-base font-semibold tabular-nums",
                      isInflow
                        ? "text-green-700 dark:text-green-400"
                        : "text-foreground"
                    )}
                  >
                    {isInflow ? "+" : ""}
                    {formatUsd(tx.amount)}
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
