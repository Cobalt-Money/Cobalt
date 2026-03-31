import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";

import {
  CategoryIcon,
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
} from "../categories";
import {
  formatDateStringLong,
  formatTransactionDateDisplay,
} from "../lib/helpers";
import { InstitutionLogo } from "../logos/institution-logo";
import { MerchantLogo } from "../logos/merchant-logo";
import { useTransactions } from "../use-transactions";
import {
  shouldShowLocationSection,
  TransactionDetailLocationSection,
} from "./transaction-detail-location";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const transactionDetailRouteApi = getRouteApi(
  "/_auth/transactions/$transactionId"
);

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="shrink-0 text-muted-foreground text-sm">{label}</span>
      <div
        className={cn(
          "min-w-0 flex-1 text-right text-foreground text-sm",
          valueClassName
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function TransactionDetailPage() {
  const { transactionId } = transactionDetailRouteApi.useParams();
  const navigate = useNavigate();
  const { isComplete, items } = useTransactions();

  const transaction = useMemo(
    () => items.find((t) => t.id === transactionId),
    [items, transactionId]
  );

  useEffect(() => {
    if (isComplete && !transaction) {
      navigate({ replace: true, to: "/transactions" });
    }
  }, [isComplete, navigate, transaction]);

  if (!transaction) {
    return (
      <div className="mx-auto flex min-h-48 w-full max-w-2xl items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <TransactionDetailContent transaction={transaction} />;
}

function TransactionDetailContent({
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
  const detailedLabel =
    category && category.detailed
      ? getDetailedCategoryDisplayName(category.detailed)
      : null;

  const showLocation = shouldShowLocationSection(transaction.location);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-10 pb-8">
      <header className="flex flex-col items-center gap-4">
        <MerchantLogo
          className="size-14"
          counterparties={transaction.counterparties}
          deferUntilVisible={false}
          logoUrl={transaction.logoUrl}
          merchantName={transaction.merchantName}
          website={transaction.website}
        />
        <div className="flex w-full flex-col gap-1 text-center sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:text-left">
          <div className="min-w-0 flex-1">
            <h1 className="text-balance font-medium text-foreground text-xl">
              {transaction.merchantName?.trim() || transaction.name}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {formatTransactionDateDisplay(transaction)}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p
              className={cn(
                "font-semibold text-2xl tabular-nums tracking-tight",
                amountColor
              )}
            >
              {currency.format(Math.abs(transaction.amount))}
            </p>
            <p className="text-muted-foreground text-xs">
              {isDebit ? "Debit" : "Credit"} ·{" "}
              {transaction.pending ? "Pending" : "Posted"}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="mb-3 font-medium text-foreground text-sm">
            Transaction details
          </h2>
          <div>
            <DetailRow label="Name" value={transaction.name} />
            {transaction.merchantName ? (
              <DetailRow label="Merchant" value={transaction.merchantName} />
            ) : null}
            <DetailRow
              label="Amount"
              value={currency.format(Math.abs(transaction.amount))}
              valueClassName={amountColor}
            />
            <DetailRow
              label="Type"
              value={isDebit ? "Debit" : "Credit"}
              valueClassName={amountColor}
            />
            <DetailRow
              label="Status"
              value={transaction.pending ? "Pending" : "Posted"}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-medium text-foreground text-sm">Dates</h2>
          <div>
            <DetailRow
              label="Transaction date"
              value={formatDateStringLong(transaction.date)}
            />
            {transaction.authorizedDate ? (
              <DetailRow
                label="Authorized date"
                value={formatDateStringLong(transaction.authorizedDate)}
              />
            ) : null}
            <DetailRow
              label="Shown in list"
              value={formatTransactionDateDisplay(transaction)}
            />
          </div>
        </section>

        {category && categoryConfig ? (
          <section>
            <h2 className="mb-3 font-medium text-foreground text-sm">
              Category
            </h2>
            <div>
              <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span className="text-muted-foreground text-sm">Primary</span>
                <div className="flex items-center justify-end gap-2 text-sm">
                  <CategoryIcon icon={categoryConfig.icon} />
                  <span>{categoryConfig.label}</span>
                </div>
              </div>
              {detailedLabel ? (
                <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <span className="text-muted-foreground text-sm">
                    Detailed
                  </span>
                  <span className="text-right text-foreground text-sm">
                    {detailedLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 font-medium text-foreground text-sm">Account</h2>
          <div>
            <DetailRow label="Account name" value={transaction.accountName} />
            <DetailRow label="Account type" value={transaction.accountType} />
          </div>
        </section>

        {transaction.institutionName ? (
          <section>
            <h2 className="mb-3 font-medium text-foreground text-sm">
              Institution
            </h2>
            <div>
              <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span className="text-muted-foreground text-sm">Name</span>
                <div className="flex items-center justify-end gap-2 text-sm">
                  <InstitutionLogo
                    institutionLogo={transaction.institutionLogo}
                    institutionName={transaction.institutionName}
                    institutionUrl={transaction.institutionUrl}
                  />
                  <span className="text-right">
                    {transaction.institutionName}
                  </span>
                </div>
              </div>
              {transaction.institutionUrl ? (
                <DetailRow
                  label="Website"
                  value={
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={transaction.institutionUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {transaction.institutionUrl}
                    </a>
                  }
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {showLocation ? (
          <TransactionDetailLocationSection location={transaction.location} />
        ) : null}
      </div>
    </div>
  );
}
