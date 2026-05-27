import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { PrivateAmount } from "../../../components/privacy";
import { AccountLogo } from "../../accounts/account-logo";
import { MerchantLogo } from "../../logos/merchant-logo";
import type { MerchantSearchState } from "../add-transaction-dialog";
import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "../categories";
import { getTransactionDisplayName } from "../lib/helpers";
import { TagChip } from "../tags/tag-chip";
import type { TagOption } from "../tags/tag-picker";
import { TagPicker } from "../tags/tag-picker";
import { EditableCategory } from "./editable-category";
import type { CategoryPickerOption } from "./editable-category";
import { EditableDate } from "./editable-date";
import { EditableLocation } from "./editable-location";
import { EditableMerchantLogo } from "./editable-merchant-logo";
import { EditableName } from "./editable-name";
import {
  shouldShowLocationSection,
  TransactionDetailLocationCard,
} from "./transaction-detail-location";

type LocationJson = NonNullable<TransactionResponse["location"]>;

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
  onUpdateCategory: (value: { categoryId: string }) => void;
  /** All non-deleted, non-hidden cats for the picker. Caller fetches via `queries.categories.list`. */
  categoryOptions: readonly CategoryPickerOption[];
  /** Optional: caller wires "+ New category" row in picker to its create-dialog. */
  onCreateCategory?: () => void;
  onUpdateDate: (dateIso: string) => void;
  onUpdateLocation: (location: LocationJson) => void;
  onUpdateMerchant: (args: { merchantName: string | null; website: string | null }) => void;
  /** Brandfetch typeahead for merchant editing. */
  merchantSearch: MerchantSearchState;
  onUpdateName: (name: string) => void;
  onUpdateNotes: (markdown: string) => void;
  /** Only set for manual transactions; absence hides the delete affordance. */
  onDelete?: () => void;
  /** Currently attached tag ids; null = unknown/loading, [] = none. */
  tagIds?: readonly string[] | null;
  /** Active tags available for selection. Omit to hide tag section. */
  availableTags?: readonly TagOption[];
  /** Replace tag set on this transaction. */
  onUpdateTags?: (next: string[]) => void;
  /** Fires when user picks "Create <name> tag" — host opens add-tag dialog/sub-page. */
  onRequestCreateTag?: (initialName: string) => void;
}

// eslint-disable-next-line complexity
export function TransactionDetailSummary({
  edit,
  transaction,
}: {
  edit?: TransactionDetailEditHandlers;
  transaction: TransactionResponse;
}) {
  const isDebit = transaction.amount < 0;
  const amountColor = isDebit ? "text-destructive" : "text-success";

  const { category } = transaction;
  const showLocation = shouldShowLocationSection(transaction.location);
  const displayName = getTransactionDisplayName(transaction);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        {edit ? (
          <EditableName displayName={displayName} onSubmit={edit.onUpdateName} />
        ) : (
          <div className="min-w-0 flex-1">
            <h1 className="text-balance text-left font-medium text-2xl text-foreground leading-tight tracking-tight sm:text-3xl">
              {displayName}
            </h1>
            {transaction.merchantName && transaction.name !== transaction.merchantName && (
              <p className="mt-0.5 truncate text-muted-foreground text-xs">{transaction.name}</p>
            )}
          </div>
        )}
        {edit ? (
          <EditableMerchantLogo
            merchantSearch={edit.merchantSearch}
            onSubmit={edit.onUpdateMerchant}
            transaction={transaction}
          />
        ) : (
          <MerchantLogo
            className="size-12 shrink-0"
            counterparties={transaction.counterparties}
            deferUntilVisible={false}
            logoUrl={transaction.logoUrl}
            merchantName={transaction.merchantName}
            website={transaction.website}
          />
        )}
      </div>
      <p className={cn("text-left font-semibold text-xl tabular-nums tracking-tight", amountColor)}>
        <PrivateAmount>{currency.format(Math.abs(transaction.amount))}</PrivateAmount>
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-base">
          <img
            alt=""
            aria-hidden
            className="size-5 shrink-0 object-contain"
            decoding="async"
            height={20}
            src={transaction.pending ? "/assets/vectors/pending.svg" : "/assets/vectors/posted.svg"}
            width={20}
          />
          <span className="text-muted-foreground">
            {transaction.pending ? "Pending" : "Posted"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-base">
          <span className="flex size-5 shrink-0 items-center justify-center">
            <AccountLogo
              institutionLogo={transaction.institutionLogo}
              logoDomain={
                transaction.source === "manual"
                  ? transaction.accountLogoDomain
                  : transaction.institutionUrl
              }
              name={transaction.institutionName ?? transaction.accountName}
              source={transaction.source}
              subtype={transaction.accountSubtype}
            />
          </span>
          <span className="min-w-0 truncate text-foreground">{transaction.accountName}</span>
          <span className="text-muted-foreground">
            {transaction.accountSubtype
              ? transaction.accountSubtype.replaceAll("_", " ")
              : transaction.accountType}
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
            onCreateCategory={edit.onCreateCategory}
            onReset={edit.onResetCategory}
            onSubmit={edit.onUpdateCategory}
            options={edit.categoryOptions}
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

        {edit?.availableTags && edit.onUpdateTags ? (
          <TagsRow
            availableTags={edit.availableTags}
            onRequestCreate={edit.onRequestCreateTag}
            onUpdate={edit.onUpdateTags}
            selectedIds={edit.tagIds ?? []}
          />
        ) : null}
      </div>

      {showLocation ? <TransactionDetailLocationCard location={transaction.location} /> : null}
    </div>
  );
}

function TagsRow({
  availableTags,
  onRequestCreate,
  onUpdate,
  selectedIds,
}: {
  availableTags: readonly TagOption[];
  onRequestCreate?: (initialName: string) => void;
  onUpdate: (next: string[]) => void;
  selectedIds: readonly string[];
}) {
  const byId = new Map(availableTags.map((t) => [t.id, t] as const));
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean) as TagOption[];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-base leading-6">
      {selected.map((t) => (
        <TagChip
          color={t.color}
          key={t.id}
          name={t.name}
          onRemove={() => onUpdate(selectedIds.filter((id) => id !== t.id))}
        />
      ))}
      <TagPicker
        onChange={(next) => onUpdate(next)}
        onRequestCreate={onRequestCreate}
        options={[...availableTags]}
        selectedIds={[...selectedIds]}
      />
    </div>
  );
}

function ReadOnlyCategoryRow({ category }: { category: TransactionResponse["category"] }) {
  if (!category) {
    return null;
  }
  const icon = resolveCategoryIcon(category.iconKey) ?? UNKNOWN_CATEGORY_ICON;
  const groupLabel = category.groupName;
  return (
    <div
      className="flex min-w-0 items-center gap-2 text-base leading-6"
      title={groupLabel ? `${groupLabel} › ${category.name}` : category.name}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <CategoryIcon icon={icon} />
      </span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-foreground">{groupLabel ?? category.name}</span>
        {groupLabel ? (
          <>
            <HugeiconsIcon
              aria-hidden
              className="size-3 shrink-0 text-muted-foreground"
              icon={ArrowRight01Icon}
              strokeWidth={2}
            />
            <span className="min-w-0 truncate text-muted-foreground">{category.name}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
