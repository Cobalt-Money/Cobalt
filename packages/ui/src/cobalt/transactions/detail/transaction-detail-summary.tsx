import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { PrivateAmount } from "../../../components/privacy";
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
import { EditableLocation } from "./editable-location";
import { EditableName } from "./editable-name";
import {
  shouldShowLocationSection,
  TransactionDetailLocationCard,
} from "./transaction-detail-location";

type LocationJson = NonNullable<TransactionListItem["location"]>;

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

export interface GeocodeSearchResult {
  displayName: string;
  location: LocationJson;
}

export interface LocationSearchState {
  loading: boolean;
  onQueryChange: (query: string) => void;
  results: GeocodeSearchResult[];
}

export interface TransactionDetailEditHandlers {
  locationSearch: LocationSearchState;
  onResetCategory: () => void;
  onResetDate: () => void;
  onResetNotes: () => void;
  onResetLocation: () => void;
  onUpdateCategory: (value: { detailed: string; primary: string }) => void;
  onUpdateDate: (dateIso: string) => void;
  onUpdateLocation: (location: LocationJson) => void;
  onUpdateName: (name: string) => void;
  onUpdateNotes: (markdown: string) => void;
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

  const category = transaction.category
    ? {
        confidence_level: transaction.categoryConfidence ?? undefined,
        detailed: transaction.categoryDetail ?? "",
        primary: transaction.category,
      }
    : null;
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
            <h1 className="text-balance text-left font-medium text-2xl text-foreground leading-tight tracking-tight sm:text-3xl">
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
          "text-left font-semibold text-xl tabular-nums tracking-tight",
          amountColor
        )}
      >
        <PrivateAmount>
          {currency.format(Math.abs(transaction.amount))}
        </PrivateAmount>
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-base">
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
        <div className="flex items-center gap-2.5 text-base">
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
            isOverridden={false}
            onReset={edit.onResetDate}
            onSubmit={edit.onUpdateDate}
          />
        ) : null}

        {edit ? (
          <EditableCategory
            category={category}
            isOverridden={false}
            onReset={edit.onResetCategory}
            onSubmit={edit.onUpdateCategory}
          />
        ) : (
          <ReadOnlyCategoryRow category={category} />
        )}

        {edit ? (
          <EditableLocation
            isOverridden={false}
            loading={edit.locationSearch.loading}
            location={transaction.location}
            onQueryChange={edit.locationSearch.onQueryChange}
            onReset={edit.onResetLocation}
            onSubmit={edit.onUpdateLocation}
            results={edit.locationSearch.results}
          />
        ) : null}
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
  category: {
    primary: string;
    detailed: string;
    confidence_level?: string;
  } | null;
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
      className="flex min-w-0 items-center gap-2 text-base leading-6"
      title={
        detailedLabel
          ? `${categoryConfig.label} › ${detailedLabel}`
          : categoryConfig.label
      }
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
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
