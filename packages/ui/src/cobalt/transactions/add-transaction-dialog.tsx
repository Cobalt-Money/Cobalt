import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Button } from "@cobalt-web/ui/components/button";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Calendar03Icon,
  Folder02Icon,
  Location01Icon,
  Money01Icon,
  Store01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AccountLogo } from "../accounts/account-logo";
import { CobaltDialog } from "../cobalt-dialog";
import { CobaltSelectPopover } from "../select-popover";
import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "./categories";
import { CategoryPicker } from "./detail/category-picker";
import type { CategoryPickerOption } from "./detail/editable-category";
import type { TagOption } from "./tags/tag-picker";
import { TagPicker } from "./tags/tag-picker";
import type { TransactionNotesInputHandle } from "./transaction-notes-input";
import { TransactionNotesInput } from "./transaction-notes-input";

/** Group system keys that represent inflow (negative signed amount per Plaid convention). */
const INFLOW_GROUP_KEYS: ReadonlySet<string> = new Set(["income", "transfers"]);

type LocationJson = NonNullable<TransactionListItem["location"]>;

export interface GeocodeSearchResult {
  displayName: string;
  location: LocationJson;
}

export interface GeocodeSearchState {
  loading: boolean;
  results: readonly GeocodeSearchResult[];
  onQueryChange: (query: string) => void;
}

function summarizeLocation(loc: LocationJson | null): string {
  if (!loc) {
    return "";
  }
  return [loc.address, loc.city, loc.region].filter(Boolean).join(", ");
}

function renderLocationResults({
  loading,
  query,
  results,
  onPick,
}: {
  loading: boolean;
  query: string;
  results: readonly GeocodeSearchResult[];
  onPick: (r: GeocodeSearchResult) => void;
}) {
  if (loading) {
    return <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Searching…</div>;
  }
  if (query.trim() === "") {
    return (
      <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Type to search</div>
    );
  }
  if (results.length === 0) {
    return <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">No results</div>;
  }
  return results.map((r) => (
    <button
      className="flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
      key={r.displayName}
      onClick={() => {
        onPick(r);
      }}
      type="button"
    >
      {r.displayName}
    </button>
  ));
}

function renderMerchantPickerResults({
  merchantSearch,
  query,
  hasMerchant,
  onClear,
  onPick,
  onUseTyped,
}: {
  merchantSearch: MerchantSearchState;
  query: string;
  hasMerchant: boolean;
  onClear: () => void;
  onPick: (r: MerchantSuggestionItem) => void;
  onUseTyped: () => void;
}) {
  if (merchantSearch.loading && merchantSearch.results.length === 0) {
    return <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Searching…</div>;
  }
  if (query.trim().length < 2) {
    if (hasMerchant) {
      return (
        <button
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
          onClick={onClear}
          type="button"
        >
          Clear merchant
        </button>
      );
    }
    return (
      <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Type to search</div>
    );
  }
  if (merchantSearch.results.length === 0) {
    return (
      <button
        className="flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
        onClick={onUseTyped}
        type="button"
      >
        Use "{query.trim()}"
      </button>
    );
  }
  return merchantSearch.results.slice(0, 8).map((r) => (
    <button
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
      key={r.brandId}
      onClick={() => onPick(r)}
      type="button"
    >
      {r.icon ? (
        <img
          alt=""
          className="size-5 shrink-0 rounded-sm bg-foreground/5 object-contain"
          src={r.icon}
        />
      ) : (
        <div className="size-5 shrink-0 rounded-sm bg-foreground/5" />
      )}
      <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
      {r.domain ? <span className="shrink-0 text-muted-foreground text-xs">{r.domain}</span> : null}
    </button>
  ));
}

export interface AddTransactionAccountOption {
  id: string;
  name: string;
  /** Raw subtype — drives cash-glyph special case for `subtype === "cash"`. */
  subtype: string | null;
  /** Brandfetch domain (manual accounts) — feeds InstitutionLogo CDN candidates. */
  logoDomain: string | null;
}

export interface MerchantSuggestionItem {
  brandId: string;
  name: string;
  domain: string | null;
  icon: string | null;
}

export interface MerchantSearchState {
  loading: boolean;
  results: readonly MerchantSuggestionItem[];
  onQueryChange: (query: string) => void;
}

export interface AddTransactionFormValues {
  accountId: string;
  name: string;
  /** Plaid sign convention: positive = expense, negative = income. */
  amount: number;
  /** ISO YYYY-MM-DD. */
  date: string;
  merchantName: string | null;
  /** Brandfetch domain when picked from typeahead, else null. */
  merchantWebsite: string | null;
  description: string | null;
  /** SRI-311: FK to user's category row, or null (defaults to uncategorized). */
  categoryId: string | null;
  /** Geocoded location, or null. */
  location: LocationJson | null;
  /** Tag ids selected by the user. */
  tagIds: string[];
}

export interface AddTransactionFormProps {
  onSubmit: (values: AddTransactionFormValues) => void;
  accounts: readonly AddTransactionAccountOption[];
  /** All non-deleted, non-hidden cats for the picker (Zero-fed). */
  categoryOptions: readonly CategoryPickerOption[];
  submitting?: boolean;
  /** Fires when user hits Backspace with empty name input. Used by command palette to "morph back". */
  onBackspaceWhenEmpty?: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
  /** Geocode search wiring; omit to hide the location pill. */
  locationSearch?: GeocodeSearchState;
  /** Brandfetch merchant typeahead wiring; omit to disable suggestions. */
  merchantSearch?: MerchantSearchState;
  /** Empty-state CTA — host opens cash dialog or morphs to the sub-page. */
  onCreateCashAccount?: () => void;
  /** Available active tags for the picker; omit to hide the tag pill. */
  availableTags?: readonly TagOption[];
  /** Fires when user picks "Create <name> tag" — host opens add-tag dialog/sub-page. */
  onRequestCreateTag?: (initialName: string) => void;
}

export interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddTransactionFormValues) => void;
  accounts: readonly AddTransactionAccountOption[];
  categoryOptions: readonly CategoryPickerOption[];
  submitting?: boolean;
  /** Fires when user hits Backspace with empty name input. Used by command palette to "morph back". */
  onBackspaceWhenEmpty?: () => void;
  locationSearch?: GeocodeSearchState;
  merchantSearch?: MerchantSearchState;
  onCreateCashAccount?: () => void;
  availableTags?: readonly TagOption[];
  onRequestCreateTag?: (initialName: string) => void;
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(iso: string): string {
  if (iso === todayIso()) {
    return "Today";
  }
  return isoToDate(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// eslint-disable-next-line complexity
export function AddTransactionForm({
  onSubmit,
  accounts,
  categoryOptions,
  submitting = false,
  onBackspaceWhenEmpty,
  submitLabel = "Create transaction",
  autoFocus = true,
  locationSearch,
  merchantSearch,
  onCreateCashAccount,
  availableTags,
  onRequestCreateTag,
}: AddTransactionFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const notesRef = useRef<TransactionNotesInputHandle>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryPickerOption | null>(null);
  const [date, setDate] = useState(todayIso());
  const [merchant, setMerchant] = useState("");
  const [merchantDomain, setMerchantDomain] = useState<string | null>(null);
  const [merchantIcon, setMerchantIcon] = useState<string | null>(null);
  const [merchantQuery, setMerchantQuery] = useState("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [location, setLocation] = useState<LocationJson | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName("");
    notesRef.current?.reset("");
    setAmount("");
    setSelectedCategory(null);
    setDate(todayIso());
    setMerchant("");
    setMerchantDomain(null);
    setMerchantIcon(null);
    setMerchantQuery("");
    setAccountId(accounts[0]?.id ?? "");
    setLocation(null);
    setLocationQuery("");
    setTagIds([]);
    if (!autoFocus) {
      return;
    }
    // Double-RAF ensures cmdk's own focus management has settled before we
    // grab focus for the title input (cmdk Command root focuses its input on
    // mount; without the second frame we'd lose focus when embedded as a
    // command-palette sub-page).
    let secondId = 0;
    const firstId = window.requestAnimationFrame(() => {
      secondId = window.requestAnimationFrame(() => {
        titleRef.current?.focus();
      });
    });
    return () => {
      window.cancelAnimationFrame(firstId);
      if (secondId) {
        window.cancelAnimationFrame(secondId);
      }
    };
  }, [accounts, autoFocus]);

  const noAccounts = accounts.length === 0;
  const parsedAmount = Number(amount);
  const validAmount = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSubmit =
    !submitting && !noAccounts && accountId !== "" && name.trim().length > 0 && validAmount;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    const isInflow =
      selectedCategory !== null &&
      selectedCategory.groupSystemKey !== null &&
      INFLOW_GROUP_KEYS.has(selectedCategory.groupSystemKey);
    const signed = isInflow ? -parsedAmount : parsedAmount;
    const description = (notesRef.current?.getMarkdown() ?? "").trim();
    onSubmit({
      accountId,
      amount: signed,
      categoryId: selectedCategory?.id ?? null,
      date,
      description: description === "" ? null : description,
      location,
      merchantName: merchant.trim() === "" ? null : merchant.trim(),
      merchantWebsite: merchantDomain,
      name: name.trim(),
      tagIds,
    });
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const accountLabel = selectedAccount?.name ?? "Account";

  const selectedDate = useMemo(() => isoToDate(date), [date]);

  if (noAccounts) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground text-sm">
          Create a cash account first to add manual transactions.
        </p>
        {onCreateCashAccount ? (
          <Button onClick={onCreateCashAccount} size="sm" type="button">
            Create cash account
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <input
          aria-label="Transaction name"
          className="min-w-0 flex-1 cursor-text bg-transparent font-medium text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
          maxLength={255}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && name === "" && onBackspaceWhenEmpty) {
              e.preventDefault();
              onBackspaceWhenEmpty();
            }
          }}
          placeholder="Name"
          ref={titleRef}
          value={name}
        />
        <Popover>
          <PopoverTrigger
            render={
              <button
                className="-mx-1 flex shrink-0 items-center gap-2 rounded-md px-1 py-1 text-base text-foreground transition-colors hover:bg-input/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                type="button"
              >
                <HugeiconsIcon
                  className="size-4 text-muted-foreground"
                  icon={Calendar03Icon}
                  strokeWidth={2}
                />
                {formatDateLabel(date)}
              </button>
            }
          />
          <PopoverContent align="end" className="w-auto p-2">
            <Calendar
              mode="single"
              onSelect={(d) => {
                if (d) {
                  setDate(dateToIso(d));
                }
              }}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-baseline gap-0.5">
        <span
          className={cn(
            "text-lg tabular-nums",
            amount.trim() === "" ? "text-muted-foreground/50" : "text-foreground",
          )}
        >
          $
        </span>
        <input
          aria-label="Amount"
          className="min-w-0 flex-1 cursor-text bg-transparent text-lg text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50"
          inputMode="decimal"
          min={0}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          placeholder="0.00"
          step="0.01"
          type="number"
          value={amount}
        />
      </div>

      <div
        aria-label="Description"
        className="scrollbar-thin max-h-36 w-full overflow-y-auto text-base leading-normal"
      >
        <TransactionNotesInput maxLength={2000} placeholder="Add a note…" ref={notesRef} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-2">
        <CategoryPicker
          onSelect={(item) => {
            setSelectedCategory(item);
          }}
          options={categoryOptions}
          selectedKey={selectedCategory?.id ?? null}
          trigger={
            <button
              className={cn(
                "inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
                selectedCategory
                  ? "border-foreground/15 bg-input/40 text-foreground"
                  : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
              )}
              type="button"
            >
              <span className="flex size-[1.125rem] shrink-0 items-center justify-center">
                {selectedCategory ? (
                  <CategoryIcon
                    icon={resolveCategoryIcon(selectedCategory.iconKey) ?? UNKNOWN_CATEGORY_ICON}
                    sizeClassName="size-[1.125rem]"
                  />
                ) : (
                  <HugeiconsIcon className="size-[1.125rem]" icon={Folder02Icon} strokeWidth={2} />
                )}
              </span>
              {selectedCategory ? selectedCategory.name : "Category"}
            </button>
          }
        />

        <CobaltSelectPopover
          emptyText="No accounts"
          itemKey={(acc: AddTransactionAccountOption) => acc.id}
          itemMatch={(acc: AddTransactionAccountOption, q) => acc.name.toLowerCase().includes(q)}
          items={accounts}
          onSelect={(acc: AddTransactionAccountOption) => {
            setAccountId(acc.id);
          }}
          renderLabel={(acc: AddTransactionAccountOption) => acc.name}
          searchPlaceholder="Search accounts…"
          selectedKey={accountId}
          trigger={
            <button
              className="inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-input/40 px-2 text-foreground text-xs transition-colors"
              type="button"
            >
              <AccountLogo
                className="size-5 shrink-0"
                logoDomain={selectedAccount?.logoDomain ?? null}
                name={selectedAccount?.name ?? null}
                source="manual"
                subtype={selectedAccount?.subtype ?? "cash"}
              />
              {accountLabel}
            </button>
          }
        />

        {availableTags ? (
          <TagPicker
            onChange={setTagIds}
            onRequestCreate={onRequestCreateTag}
            options={[...availableTags]}
            selectedIds={tagIds}
            trigger={
              <button
                className="inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-foreground/5 px-2 text-muted-foreground text-xs transition-colors hover:bg-foreground/10"
                type="button"
              >
                <HugeiconsIcon className="size-3.5 shrink-0" icon={Tag01Icon} strokeWidth={2} />
                {tagIds.length > 0 ? `Tags · ${tagIds.length}` : "Tags"}
              </button>
            }
          />
        ) : null}

        {merchantSearch ? (
          <Popover
            onOpenChange={(o) => {
              if (!o) {
                setMerchantQuery("");
                merchantSearch.onQueryChange("");
              }
            }}
          >
            <PopoverTrigger
              render={
                <button
                  className={cn(
                    "inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
                    merchant
                      ? "border-foreground/15 bg-input/40 text-foreground"
                      : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                  )}
                  type="button"
                >
                  {merchant && merchantIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="size-3.5 shrink-0 rounded-sm object-contain"
                      src={merchantIcon}
                    />
                  ) : (
                    <HugeiconsIcon
                      className="size-3.5 shrink-0"
                      icon={Store01Icon}
                      strokeWidth={2}
                    />
                  )}
                  {merchant || "Merchant"}
                </button>
              }
            />
            <PopoverContent
              align="start"
              className="w-72 gap-0 bg-[oklch(0.949_0_0)] p-1 dark:bg-[oklch(0.29_0_0)]"
            >
              <div className="flex items-center px-2.5 py-1.5">
                <input
                  autoFocus
                  className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  maxLength={255}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMerchantQuery(v);
                    merchantSearch.onQueryChange(v);
                  }}
                  placeholder="Search merchant…"
                  value={merchantQuery}
                />
              </div>
              <div className="scrollbar-thin max-h-72 overflow-y-auto">
                {renderMerchantPickerResults({
                  hasMerchant: Boolean(merchant),
                  merchantSearch,
                  onClear: () => {
                    setMerchant("");
                    setMerchantDomain(null);
                    setMerchantIcon(null);
                    setMerchantQuery("");
                    merchantSearch.onQueryChange("");
                  },
                  onPick: (r) => {
                    setMerchant(r.name);
                    setMerchantDomain(r.domain);
                    setMerchantIcon(r.icon);
                    setMerchantQuery("");
                    merchantSearch.onQueryChange("");
                  },
                  onUseTyped: () => {
                    setMerchant(merchantQuery.trim());
                    setMerchantDomain(null);
                    setMerchantIcon(null);
                    setMerchantQuery("");
                    merchantSearch.onQueryChange("");
                  },
                  query: merchantQuery,
                })}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        {locationSearch ? (
          <Popover
            onOpenChange={(o) => {
              if (!o) {
                setLocationQuery("");
                locationSearch.onQueryChange("");
              }
            }}
          >
            <PopoverTrigger
              render={
                <button
                  className={cn(
                    "inline-flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
                    location
                      ? "border-foreground/15 bg-input/40 text-foreground"
                      : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                  )}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-3.5 shrink-0"
                    icon={Location01Icon}
                    strokeWidth={2}
                  />
                  {location ? summarizeLocation(location) : "Location"}
                </button>
              }
            />
            <PopoverContent
              align="start"
              className="gap-0 bg-[oklch(0.949_0_0)] p-1 dark:bg-[oklch(0.29_0_0)] w-72"
            >
              <div className="flex items-center px-2.5 py-1.5">
                <input
                  autoFocus
                  className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    locationSearch.onQueryChange(e.target.value);
                  }}
                  placeholder="Search address…"
                  value={locationQuery}
                />
              </div>
              <div className="scrollbar-thin max-h-72 overflow-y-auto">
                {renderLocationResults({
                  loading: locationSearch.loading,
                  onPick: (r) => {
                    setLocation(r.location);
                    setLocationQuery("");
                    locationSearch.onQueryChange("");
                  },
                  query: locationQuery,
                  results: locationSearch.results,
                })}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <div className="flex justify-end pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Creating…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  categoryOptions,
  submitting = false,
  onBackspaceWhenEmpty,
  locationSearch,
  merchantSearch,
  onCreateCashAccount,
  availableTags,
  onRequestCreateTag,
}: AddTransactionDialogProps) {
  return (
    <CobaltDialog
      className="w-[720px] sm:max-w-3xl"
      onOpenChange={onOpenChange}
      open={open}
      title="New Transaction"
      titleClassName="text-muted-foreground"
      titleIcon={Money01Icon}
    >
      <AddTransactionForm
        accounts={accounts}
        availableTags={availableTags}
        categoryOptions={categoryOptions}
        locationSearch={locationSearch}
        merchantSearch={merchantSearch}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onCreateCashAccount={onCreateCashAccount}
        onRequestCreateTag={onRequestCreateTag}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </CobaltDialog>
  );
}
