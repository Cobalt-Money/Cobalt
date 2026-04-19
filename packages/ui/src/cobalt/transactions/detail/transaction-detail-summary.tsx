import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { InstitutionLogo } from "../../logos/institution-logo";
import { MerchantLogo } from "../../logos/merchant-logo";
import {
  CategoryIcon,
  getCategoryDisplayConfig,
  getDetailedCategoryDisplayName,
} from "../categories";
import { getTransactionDisplayName } from "../lib/helpers";
import { EditableCategory } from "./editable-category";
import { EditableDate } from "./editable-date";
import { EditableName } from "./editable-name";
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

export interface TransactionDetailEditHandlers {
  onResetCategory: () => void;
  onResetDate: () => void;
  onUpdateCategory: (value: { detailed: string; primary: string }) => void;
  onUpdateDate: (dateIso: string) => void;
  onUpdateName: (name: string) => void;
}

export function TransactionDetailSummary({
  edit,
  transaction,
}: {
  edit?: TransactionDetailEditHandlers;
  transaction: TransactionListItem;
}) {
  const isDebit = transaction.amount > 0;
  const amountColor = isDebit
    ? "text-red-600 dark:text-red-500"
    : "text-green-550";

  const category = transaction.personalFinanceCategory;
  const showLocation = shouldShowLocationSection(transaction.location);
  const displayName =
    getTransactionDisplayName(transaction) || transaction.name;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        {edit ? (
          <EditableName
            displayName={displayName}
            onSubmit={edit.onUpdateName}
          />
        ) : (
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
          </div>
        )}
        <div className="flex flex-col items-end gap-2">
          <MerchantLogo
            className="size-12 shrink-0"
            counterparties={transaction.counterparties}
            deferUntilVisible={false}
            logoUrl={transaction.logoUrl}
            merchantName={transaction.merchantName}
            website={transaction.website}
          />
        </div>
      </div>
      <p
        className={cn(
          "font-semibold text-xl tabular-nums tracking-tight",
          amountColor
        )}
      >
        {currency.format(Math.abs(transaction.amount))}
      </p>

      <div className="flex flex-col gap-3">
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

        {edit ? (
          <EditableDate
            dateIso={transaction.date}
            isOverridden={Boolean(transaction.userOverrideDate)}
            onReset={edit.onResetDate}
            onSubmit={edit.onUpdateDate}
          />
        ) : null}

        {edit ? (
          <EditableCategory
            category={category}
            isOverridden={Boolean(transaction.userOverrideCategory)}
            onReset={edit.onResetCategory}
            onSubmit={edit.onUpdateCategory}
          />
        ) : (
          <ReadOnlyCategoryRow category={category} />
        )}
      </div>

      {showLocation ? (
        <TransactionDetailLocationCard location={transaction.location} />
      ) : null}
    </div>
  );
}

function ReadOnlyCategoryRow({
  category,
}: {
  category: TransactionListItem["personalFinanceCategory"];
}) {
  if (!category) {
    return null;
  }
  const categoryConfig = getCategoryDisplayConfig(category);
  const detailedLabel = category.detailed
    ? getDetailedCategoryDisplayName(category.detailed)
    : null;
  return (
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
        <span className="shrink-0 text-foreground">{categoryConfig.label}</span>
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
  );
}
