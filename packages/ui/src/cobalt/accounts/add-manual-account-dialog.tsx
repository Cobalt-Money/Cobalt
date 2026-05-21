import { Button } from "@cobalt-web/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";

import { InstitutionLogo } from "../logos/institution-logo";
import { COMMON_CURRENCIES, CurrencyPicker } from "./currency-picker";
import {
  AppleStocksIcon,
  CreditCardIcon,
  Home04Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";

export type ManualAccountType = "depository" | "credit" | "investment" | "loan";

export interface InstitutionSuggestionItem {
  /** Stable id (e.g. Plaid institution id). */
  id: string;
  name: string;
  /** Domain or URL — used as `logoDomain` (InstitutionLogo strips to host). */
  url: string | null;
  /** Plaid CDN logo URL when present (rendered as a thumbnail in the picker). */
  logo: string | null;
}

export interface InstitutionSearchState {
  loading: boolean;
  results: readonly InstitutionSuggestionItem[];
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
    subtypes: ["checking", "savings", "cash"],
    title: "Cash & Banking",
    type: "depository",
  },
  {
    balanceLabel: "Amount owed",
    icon: CreditCardIcon,
    subtitle: "Credit card, line of credit",
    subtypes: ["credit card", "line of credit"],
    title: "Credit Card",
    type: "credit",
  },
  {
    balanceLabel: "Total value",
    icon: AppleStocksIcon,
    subtitle: "Brokerage, IRA, 401k, crypto",
    subtypes: ["brokerage", "ira", "roth ira", "401k", "hsa", "crypto"],
    title: "Investments",
    type: "investment",
  },
  {
    balanceLabel: "Outstanding balance",
    icon: Home04Icon,
    subtitle: "Mortgage, student, auto",
    subtypes: ["mortgage", "student", "auto", "personal"],
    title: "Loans",
    type: "loan",
  },
];

// eslint-disable-next-line complexity
function InstitutionPickerButton({
  institutionName,
  logoDomain,
  search,
  onPick,
}: {
  institutionName: string | null;
  logoDomain: string | null;
  search?: InstitutionSearchState;
  onPick: (inst: InstitutionSuggestionItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Render the logo as a non-interactive square when no search wiring is
  // provided — keeps the flow working for callers that don't supply a picker.
  if (!search) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md outline-none",
          logoDomain
            ? "bg-foreground/[0.03]"
            : "border border-dashed border-foreground/20 text-muted-foreground",
        )}
      >
        {logoDomain ? (
          <InstitutionLogo
            className="size-9"
            institutionLogo={null}
            institutionLogosExtra={null}
            institutionName={institutionName}
            institutionUrl={logoDomain}
            source="manual"
          />
        ) : (
          <span className="text-xl">+</span>
        )}
      </div>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label="Pick institution"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-md outline-none transition-colors",
              logoDomain
                ? "bg-foreground/[0.03] hover:bg-foreground/[0.07]"
                : "border border-dashed border-foreground/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
            type="button"
          >
            {logoDomain ? (
              <InstitutionLogo
                className="size-9"
                institutionLogo={null}
                institutionLogosExtra={null}
                institutionName={institutionName}
                institutionUrl={logoDomain}
                source="manual"
              />
            ) : (
              <span className="text-xl">+</span>
            )}
          </button>
        }
      />
      <PopoverContent align="start" className="w-80 p-1">
        <input
          aria-label="Search institutions"
          autoFocus
          className="mb-1 w-full rounded-md bg-transparent px-2.5 py-1.5 text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
          onChange={(e) => {
            setQuery(e.target.value);
            search.onQueryChange(e.target.value);
          }}
          placeholder="Search Chase, Coinbase, Vanguard…"
          value={query}
        />
        <div className="max-h-64 overflow-y-auto">
          {(() => {
            if (search.loading && search.results.length === 0) {
              return (
                <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
                  Searching…
                </div>
              );
            }
            if (search.results.length === 0) {
              return (
                <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">
                  Type to search
                </div>
              );
            }
            return search.results.slice(0, 12).map((r) => (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
                key={r.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(r);
                  setOpen(false);
                  setQuery("");
                  search.onQueryChange("");
                }}
                type="button"
              >
                <InstitutionLogo
                  className="size-5 shrink-0"
                  institutionLogo={r.logo}
                  institutionLogosExtra={null}
                  institutionName={r.name}
                  institutionUrl={r.url}
                  source="plaid"
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
              </button>
            ));
          })()}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  /** Prefill from upstream institution selection (e.g. user picked Chase, opted to add manually). */
  initialName?: string;
  initialLogoDomain?: string | null;
  /** Lock the account type and skip the type picker. Used by the Cash entry path. */
  initialType?: ManualAccountType;
  /** Wires the in-form institution picker (click the logo square). Omit to disable. */
  institutionSearch?: InstitutionSearchState;
}

export interface AddManualAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ManualAccountFormValues) => void;
  submitting?: boolean;
  onBackspaceWhenEmpty?: () => void;
  initialName?: string;
  initialLogoDomain?: string | null;
  initialType?: ManualAccountType;
  institutionSearch?: InstitutionSearchState;
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
      role="group"
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
  initialName,
  initialLogoDomain,
  institutionSearch,
}: {
  type: ManualAccountType;
  onSubmit: (values: ManualAccountFormValues) => void;
  onBackspaceWhenEmpty?: () => void;
  submitting: boolean;
  submitLabel: string;
  autoFocus: boolean;
  initialName?: string;
  initialLogoDomain?: string | null;
  institutionSearch?: InstitutionSearchState;
}) {
  const meta = useMemo(() => metaFor(type), [type]);
  const [name, setName] = useState(initialName ?? "");
  /** Editable via the logo-square picker. */
  const [logoDomain, setLogoDomain] = useState<string | null>(initialLogoDomain ?? null);
  const [institutionName, setInstitutionName] = useState<string | null>(initialName ?? null);
  // Subtype is not user-editable in this flow — defaults to the first subtype
  // for the picked type (e.g. "Brokerage" for investment). Server requires a
  // non-empty value; UI doesn't expose granular control.
  const [subtype] = useState<string>(meta.subtypes[0] ?? "");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [currency, setCurrency] = useState("USD");
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

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <InstitutionPickerButton
          institutionName={institutionName}
          logoDomain={logoDomain}
          onPick={(inst) => {
            setLogoDomain(inst.url);
            setInstitutionName(inst.name);
            if (!name.trim()) {
              setName(inst.name);
            }
          }}
          search={institutionSearch}
        />
        <input
          aria-label="Account name"
          className="min-w-0 flex-1 cursor-text bg-transparent font-semibold text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
          maxLength={255}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && name === "" && onBackspaceWhenEmpty) {
              e.preventDefault();
              onBackspaceWhenEmpty();
            }
          }}
          placeholder="Sapphire Reserve, Vanguard 401k, Wallet…"
          ref={titleRef}
          value={name}
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "shrink-0 text-lg tabular-nums",
              balance.trim() === "" ? "text-muted-foreground/50" : "text-foreground",
            )}
          >
            {COMMON_CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency}
          </span>
          <input
            aria-label={meta.balanceLabel}
            className="cursor-text bg-transparent text-lg text-foreground tabular-nums outline-none placeholder:text-muted-foreground/50 [field-sizing:content]"
            inputMode="decimal"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d*$/.test(v)) {
                setBalance(v);
              }
            }}
            placeholder={meta.balanceLabel}
            size={
              balance.trim() === ""
                ? Math.max(8, meta.balanceLabel.length)
                : Math.max(1, balance.length)
            }
            type="text"
            value={balance}
          />
          <CurrencyPicker
            onSelect={(opt) => setCurrency(opt.code)}
            selectedKey={currency}
            trigger={
              <button
                className="inline-flex h-9 shrink-0 items-center rounded-full bg-transparent px-2 font-medium text-base text-foreground transition-colors hover:bg-foreground/[0.07]"
                type="button"
              >
                {currency}
              </button>
            }
          />
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
  initialName,
  initialLogoDomain,
  initialType,
  institutionSearch,
}: AddManualAccountFormProps) {
  const [type, setType] = useState<ManualAccountType | null>(initialType ?? null);

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
      initialLogoDomain={initialLogoDomain}
      initialName={initialName}
      institutionSearch={institutionSearch}
      onBackspaceWhenEmpty={
        initialType
          ? onBackspaceWhenEmpty
          : () => {
              setType(null);
            }
      }
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
  initialName,
  initialLogoDomain,
  initialType,
  institutionSearch,
}: AddManualAccountDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="min-h-[280px] w-[720px] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add an account</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <AddManualAccountForm
            initialLogoDomain={initialLogoDomain}
            initialName={initialName}
            initialType={initialType}
            institutionSearch={institutionSearch}
            key={open ? "open" : "closed"}
            onBackspaceWhenEmpty={onBackspaceWhenEmpty}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
