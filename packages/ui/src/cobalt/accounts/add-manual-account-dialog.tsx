import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AppleStocksIcon,
  CreditCardIcon,
  Home04Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CobaltDialog } from "../cobalt-dialog";

export type ManualAccountType = "depository" | "credit" | "investment" | "loan";

export interface BrandSuggestionItem {
  brandId: string;
  name: string;
  domain: string | null;
  icon: string | null;
}

export interface BrandSearchState {
  loading: boolean;
  results: readonly BrandSuggestionItem[];
  onQueryChange: (query: string) => void;
}

export interface ManualAccountFormValues {
  name: string;
  type: ManualAccountType;
  subtype: string;
  /** Positive number; UI label depends on type. */
  currentBalance: number;
  /** Credit accounts only. */
  creditLimit: number | null;
  currency: string;
  /** Brandfetch domain when picked from typeahead, else null. */
  logoDomain: string | null;
}

interface TypeMeta {
  type: ManualAccountType;
  title: string;
  subtitle: string;
  balanceLabel: string;
  subtypes: readonly string[];
  icon: typeof Wallet01Icon;
}

const TYPE_META: readonly TypeMeta[] = [
  {
    balanceLabel: "Balance",
    icon: Wallet01Icon,
    subtitle: "Checking, savings, cash",
    subtypes: ["Checking", "Savings", "Cash"],
    title: "Cash & Banking",
    type: "depository",
  },
  {
    balanceLabel: "Amount owed",
    icon: CreditCardIcon,
    subtitle: "Credit card, line of credit",
    subtypes: ["Credit Card", "Line of Credit"],
    title: "Credit Card",
    type: "credit",
  },
  {
    balanceLabel: "Total value",
    icon: AppleStocksIcon,
    subtitle: "Brokerage, IRA, 401k, crypto",
    subtypes: ["Brokerage", "IRA", "Roth IRA", "401k", "HSA", "Crypto"],
    title: "Investments",
    type: "investment",
  },
  {
    balanceLabel: "Outstanding balance",
    icon: Home04Icon,
    subtitle: "Mortgage, student, auto",
    subtypes: ["Mortgage", "Student", "Auto", "Personal"],
    title: "Loans",
    type: "loan",
  },
];

function renderBrandResults({
  brandSearch,
  onPick,
}: {
  brandSearch: BrandSearchState;
  onPick: (r: BrandSuggestionItem) => void;
}) {
  if (brandSearch.loading && brandSearch.results.length === 0) {
    return <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Searching…</div>;
  }
  if (brandSearch.results.length === 0) {
    return (
      <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
        No matches — your typed name will be used.
      </div>
    );
  }
  return brandSearch.results.slice(0, 8).map((r) => (
    <button
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
      key={r.brandId}
      onMouseDown={(e) => {
        e.preventDefault();
        onPick(r);
      }}
      type="button"
    >
      {r.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
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

function metaFor(type: ManualAccountType): TypeMeta {
  const found = TYPE_META.find((m) => m.type === type);
  if (!found) {
    // TYPE_META covers all 4 ManualAccountType values; this is purely for type narrowing.
    throw new Error(`Unknown manual account type: ${type}`);
  }
  return found;
}

export interface AddManualAccountFormProps {
  onSubmit: (values: ManualAccountFormValues) => void;
  submitting?: boolean;
  /** Fires when user hits Backspace with empty name input. Used by command palette to "morph back". */
  onBackspaceWhenEmpty?: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
  /** Brandfetch typeahead wiring; omit to disable suggestions. */
  brandSearch?: BrandSearchState;
  /** Prefill from upstream institution selection (e.g. user picked Chase, opted to add manually). */
  initialName?: string;
  initialLogoDomain?: string | null;
}

export interface AddManualAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ManualAccountFormValues) => void;
  submitting?: boolean;
  onBackspaceWhenEmpty?: () => void;
  brandSearch?: BrandSearchState;
  initialName?: string;
  initialLogoDomain?: string | null;
}

function TypePicker({
  onChoose,
  onBackspaceWhenEmpty,
}: {
  onChoose: (type: ManualAccountType) => void;
  onBackspaceWhenEmpty?: () => void;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      onKeyDown={(e) => {
        if (e.key === "Backspace" && onBackspaceWhenEmpty) {
          e.preventDefault();
          onBackspaceWhenEmpty();
        }
      }}
    >
      {TYPE_META.map((m) => (
        <button
          className="flex items-start gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-left transition-colors hover:bg-foreground/[0.07]"
          key={m.type}
          onClick={() => onChoose(m.type)}
          type="button"
        >
          <HugeiconsIcon
            className="size-6 shrink-0 text-foreground"
            icon={m.icon}
            strokeWidth={2}
          />
          <div className="min-w-0">
            <div className="font-medium text-foreground text-sm">{m.title}</div>
            <div className="text-muted-foreground text-xs">{m.subtitle}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// eslint-disable-next-line complexity
function ManualAccountForm({
  type,
  onSubmit,
  onBackspaceWhenEmpty,
  submitting,
  submitLabel,
  autoFocus,
  brandSearch,
  initialName,
  initialLogoDomain,
}: {
  type: ManualAccountType;
  onSubmit: (values: ManualAccountFormValues) => void;
  onBackspaceWhenEmpty?: () => void;
  submitting: boolean;
  submitLabel: string;
  autoFocus: boolean;
  brandSearch?: BrandSearchState;
  initialName?: string;
  initialLogoDomain?: string | null;
}) {
  const meta = useMemo(() => metaFor(type), [type]);
  const [name, setName] = useState(initialName ?? "");
  const [logoDomain, setLogoDomain] = useState<string | null>(initialLogoDomain ?? null);
  /** Name string the current logoDomain was anchored to (initial prefill or last suggestion pick). */
  const [logoAnchorName, setLogoAnchorName] = useState<string | null>(
    initialLogoDomain ? (initialName ?? null) : null,
  );
  const [subtype, setSubtype] = useState<string>(meta.subtypes[0] ?? "");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
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
  }, [autoFocus]);

  const trimmedName = name.trim();
  const parsedBalance = balance.trim() === "" ? null : Number(balance);
  const validBalance =
    parsedBalance !== null && Number.isFinite(parsedBalance) && parsedBalance >= 0;
  const parsedLimit = creditLimit.trim() === "" ? null : Number(creditLimit);
  const validLimit =
    type !== "credit" || parsedLimit === null || (Number.isFinite(parsedLimit) && parsedLimit > 0);
  const canSubmit =
    !submitting &&
    trimmedName.length > 0 &&
    validBalance &&
    validLimit &&
    subtype.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || parsedBalance === null) {
      return;
    }
    onSubmit({
      creditLimit: type === "credit" && parsedLimit !== null ? parsedLimit : null,
      currency: currency.trim().toUpperCase() || "USD",
      currentBalance: parsedBalance,
      logoDomain,
      name: trimmedName,
      subtype: subtype.trim(),
      type,
    });
  };

  const subtypeListId = `manual-account-subtype-${type}`;
  const showResults = showSuggestions && brandSearch !== undefined && trimmedName.length >= 2;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative">
        <input
          aria-label="Account name"
          className="w-full min-w-0 cursor-text bg-transparent font-semibold text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
          maxLength={255}
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 150);
          }}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            // Drop logo only if user diverged from the name it was anchored to.
            if (logoAnchorName !== null && v.trim() !== logoAnchorName.trim()) {
              setLogoDomain(null);
              setLogoAnchorName(null);
            }
            brandSearch?.onQueryChange(v);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setShowSuggestions(true);
            brandSearch?.onQueryChange(name);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && name === "" && onBackspaceWhenEmpty) {
              e.preventDefault();
              onBackspaceWhenEmpty();
            }
            if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          placeholder="Sapphire Reserve, Vanguard 401k, Wallet…"
          ref={titleRef}
          value={name}
        />
        {showResults ? (
          <div className="absolute top-full left-0 z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-foreground/10 bg-popover p-1 shadow-md">
            {renderBrandResults({
              brandSearch,
              onPick: (r) => {
                setName(r.name);
                setLogoDomain(r.domain);
                setLogoAnchorName(r.name);
                setShowSuggestions(false);
                brandSearch.onQueryChange("");
              },
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="shrink-0">Type</span>
          <input
            aria-label="Subtype"
            className="min-w-0 cursor-text rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-foreground outline-none focus:border-foreground/30"
            list={subtypeListId}
            maxLength={64}
            onChange={(e) => setSubtype(e.target.value)}
            placeholder="e.g. Checking"
            value={subtype}
          />
          <datalist id={subtypeListId}>
            {meta.subtypes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="shrink-0">Currency</span>
          <input
            aria-label="Currency"
            className="w-16 cursor-text rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-foreground uppercase outline-none focus:border-foreground/30"
            maxLength={3}
            minLength={3}
            onChange={(e) => setCurrency(e.target.value)}
            value={currency}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div>
          <div className="text-muted-foreground text-xs">{meta.balanceLabel}</div>
          <div className="flex items-baseline gap-0.5">
            <span
              className={cn(
                "text-lg tabular-nums",
                balance.trim() === "" ? "text-muted-foreground/50" : "text-foreground",
              )}
            >
              $
            </span>
            <input
              aria-label={meta.balanceLabel}
              className="min-w-0 flex-1 cursor-text bg-transparent text-lg text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50"
              inputMode="decimal"
              min={0}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={balance}
            />
          </div>
        </div>
        {type === "credit" ? (
          <div>
            <div className="text-muted-foreground text-xs">Credit limit</div>
            <div className="flex items-baseline gap-0.5">
              <span
                className={cn(
                  "text-lg tabular-nums",
                  creditLimit.trim() === "" ? "text-muted-foreground/50" : "text-foreground",
                )}
              >
                $
              </span>
              <input
                aria-label="Credit limit"
                className="min-w-0 flex-1 cursor-text bg-transparent text-lg text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50"
                inputMode="decimal"
                min={0}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={creditLimit}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex justify-end pt-2">
        <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
          {submitting ? "Creating…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function AddManualAccountForm({
  onSubmit,
  submitting = false,
  onBackspaceWhenEmpty,
  submitLabel = "Create account",
  autoFocus = true,
  brandSearch,
  initialName,
  initialLogoDomain,
}: AddManualAccountFormProps) {
  const [type, setType] = useState<ManualAccountType | null>(null);

  if (type === null) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <TypePicker onBackspaceWhenEmpty={onBackspaceWhenEmpty} onChoose={setType} />
      </div>
    );
  }

  return (
    <ManualAccountForm
      autoFocus={autoFocus}
      brandSearch={brandSearch}
      initialLogoDomain={initialLogoDomain}
      initialName={initialName}
      onBackspaceWhenEmpty={() => {
        setType(null);
      }}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitting={submitting}
      type={type}
    />
  );
}

export function AddManualAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  onBackspaceWhenEmpty,
  brandSearch,
  initialName,
  initialLogoDomain,
}: AddManualAccountDialogProps) {
  return (
    <CobaltDialog
      className="min-h-[280px] w-[720px] sm:max-w-3xl"
      onOpenChange={onOpenChange}
      open={open}
      title="Add an account"
    >
      <AddManualAccountForm
        brandSearch={brandSearch}
        initialLogoDomain={initialLogoDomain}
        initialName={initialName}
        key={open ? "open" : "closed"}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </CobaltDialog>
  );
}
