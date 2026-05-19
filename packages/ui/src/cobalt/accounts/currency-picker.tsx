import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

export interface CurrencyOption {
  /** ISO-4217 code, e.g. "USD". */
  code: string;
  /** Display name, e.g. "US Dollar". */
  name: string;
  /** Locale flag emoji rendered as the icon. */
  flag: string;
  /** Symbol, e.g. "$" — shown after code in the list. */
  symbol: string;
}

/** Curated common currencies. Extend as needed. */
export const COMMON_CURRENCIES: readonly CurrencyOption[] = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar", symbol: "$" },
  { code: "EUR", flag: "🇪🇺", name: "Euro", symbol: "€" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound", symbol: "£" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar", symbol: "$" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar", symbol: "$" },
  { code: "CHF", flag: "🇨🇭", name: "Swiss Franc", symbol: "Fr" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", flag: "🇭🇰", name: "Hong Kong Dollar", symbol: "$" },
  { code: "SGD", flag: "🇸🇬", name: "Singapore Dollar", symbol: "$" },
  { code: "INR", flag: "🇮🇳", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", flag: "🇲🇽", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", flag: "🇧🇷", name: "Brazilian Real", symbol: "R$" },
  { code: "KRW", flag: "🇰🇷", name: "South Korean Won", symbol: "₩" },
  { code: "SEK", flag: "🇸🇪", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", flag: "🇳🇴", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", flag: "🇩🇰", name: "Danish Krone", symbol: "kr" },
  { code: "NZD", flag: "🇳🇿", name: "New Zealand Dollar", symbol: "$" },
];

interface CurrencyPickerListProps {
  selectedKey: string | null;
  onSelect: (option: CurrencyOption) => void;
  autoFocusSearch?: boolean;
  options?: readonly CurrencyOption[];
}

export function CurrencyPickerList({
  selectedKey,
  onSelect,
  autoFocusSearch = true,
  options = COMMON_CURRENCIES,
}: CurrencyPickerListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") {
      return options;
    }
    return options.filter(
      (o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <>
      <div className="flex items-center px-2.5 py-1.5">
        <input
          autoFocus={autoFocusSearch}
          className="min-w-0 flex-1 cursor-text bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Search currencies…"
          value={query}
        />
      </div>
      <div className="scrollbar-thin max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">No matches</div>
        ) : (
          filtered.map((opt) => {
            const isSelected = opt.code === selectedKey;
            return (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
                  isSelected && "bg-foreground/10",
                )}
                key={opt.code}
                onClick={() => onSelect(opt)}
                type="button"
              >
                <span aria-hidden className="text-base leading-none">
                  {opt.flag}
                </span>
                <span className="font-medium text-foreground">{opt.code}</span>
                <span className="text-muted-foreground text-xs">{opt.name}</span>
                <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                  {opt.symbol}
                </span>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

export interface CurrencyPickerProps {
  trigger: ReactElement;
  selectedKey: string | null;
  onSelect: (option: CurrencyOption) => void;
  options?: readonly CurrencyOption[];
}

export function CurrencyPicker({ trigger, selectedKey, onSelect, options }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-64 gap-0 bg-popover p-1 dark:bg-popover">
        <CurrencyPickerList
          onSelect={(opt) => {
            onSelect(opt);
            setOpen(false);
          }}
          options={options}
          selectedKey={selectedKey}
        />
      </PopoverContent>
    </Popover>
  );
}
