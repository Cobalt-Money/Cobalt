import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  CategoryIcon,
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
} from "../categories";
import { InstitutionLogo } from "../logos/institution-logo";
import { MerchantLogo } from "../logos/merchant-logo";
import {
  shouldShowLocationSection,
  TransactionDetailLocationCard,
} from "./transaction-detail-location";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

export function TransactionDetailSummary({
  transaction,
}: {
  transaction: TransactionListItem;
}) {
  const isDebit = transaction.amount > 0;
  const amountColor = isDebit
    ? "text-red-600 dark:text-red-500"
    : "text-green-600 dark:text-green-500";

  const category = transaction.personalFinanceCategory;
  const categoryConfig = category ? getCategoryDisplayConfig(category) : null;
  const detailedLabel = category?.detailed
    ? getDetailedCategoryDisplayName(category.detailed)
    : null;

  const showLocation = shouldShowLocationSection(transaction.location);
  const displayName =
    transaction.userOverrideName?.trim() ||
    transaction.merchantName?.trim() ||
    transaction.name;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero: name + amount (left), logo (right) */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance font-medium text-2xl text-foreground leading-tight tracking-tight sm:text-3xl">
            {displayName}
          </h1>
          {transaction.merchantName &&
            transaction.name !== transaction.merchantName && (
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {transaction.name}
              </p>
            )}
          <p
            className={cn(
              "mt-2 font-semibold text-xl tabular-nums tracking-tight",
              amountColor
            )}
          >
            {currency.format(Math.abs(transaction.amount))}
          </p>
        </div>
        <MerchantLogo
          className="size-12 shrink-0"
          counterparties={transaction.counterparties}
          deferUntilVisible={false}
          logoUrl={transaction.logoUrl}
          merchantName={transaction.merchantName}
          website={transaction.website}
        />
      </div>

      {/* Contextual lines — no labels, self-describing via icons */}
      <div className="flex flex-col gap-3">
        {/* Account */}
        <div className="flex items-center gap-2.5 text-sm">
          <img
            alt=""
            aria-hidden
            className="size-5 shrink-0 object-contain"
            decoding="async"
            height={20}
            src={
              transaction.pending
                ? "/assets/vectors/pending.svg"
                : "/assets/vectors/posted.svg"
            }
            width={20}
          />
          <span className="text-muted-foreground">
            {transaction.pending ? "Pending" : "Posted"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <span className="flex size-5 shrink-0 items-center justify-center">
            <InstitutionLogo
              institutionLogo={transaction.institutionLogo}
              institutionName={transaction.institutionName}
              institutionUrl={transaction.institutionUrl}
            />
          </span>
          <span className="min-w-0 truncate text-foreground">
            {transaction.accountName}
          </span>
          <span className="text-muted-foreground">
            {transaction.accountType}
          </span>
        </div>

        {/* Category — same pattern as transactions table */}
        {category && categoryConfig ? (
          <div
            className="flex min-w-0 items-center gap-2 text-sm leading-5"
            title={
              detailedLabel
                ? `${categoryConfig.label} › ${detailedLabel}`
                : categoryConfig.label
            }
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <CategoryIcon icon={categoryConfig.icon} />
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-foreground">
                {categoryConfig.label}
              </span>
              {detailedLabel ? (
                <>
                  <HugeiconsIcon
                    aria-hidden
                    className="size-3 shrink-0 text-muted-foreground"
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                  />
                  <span className="min-w-0 truncate text-muted-foreground">
                    {detailedLabel}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Location (map card, no header) */}
      {showLocation ? (
        <TransactionDetailLocationCard location={transaction.location} />
      ) : null}
    </div>
  );
}
