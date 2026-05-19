import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { MerchantLogo } from "../../logos/merchant-logo";
import type { MerchantSearchState, MerchantSuggestionItem } from "../add-transaction-dialog";

/**
 * Surfaced when the merchant search input is empty — top consumer merchants by
 * brand-fetch domain. Saves users a typeahead round-trip for the common case.
 * `icon=null` lets `<img>` fall back to the rounded grey square — the
 * Brandfetch logo is fetched live on hover/click via the existing flow.
 */
const DEFAULT_MERCHANTS: readonly MerchantSuggestionItem[] = [
  { brandId: "default:amazon", domain: "amazon.com", icon: null, name: "Amazon" },
  { brandId: "default:starbucks", domain: "starbucks.com", icon: null, name: "Starbucks" },
  { brandId: "default:target", domain: "target.com", icon: null, name: "Target" },
  { brandId: "default:walmart", domain: "walmart.com", icon: null, name: "Walmart" },
  { brandId: "default:costco", domain: "costco.com", icon: null, name: "Costco" },
  { brandId: "default:uber", domain: "uber.com", icon: null, name: "Uber" },
  { brandId: "default:lyft", domain: "lyft.com", icon: null, name: "Lyft" },
  { brandId: "default:doordash", domain: "doordash.com", icon: null, name: "DoorDash" },
  { brandId: "default:netflix", domain: "netflix.com", icon: null, name: "Netflix" },
  { brandId: "default:spotify", domain: "spotify.com", icon: null, name: "Spotify" },
  { brandId: "default:apple", domain: "apple.com", icon: null, name: "Apple" },
  { brandId: "default:google", domain: "google.com", icon: null, name: "Google" },
];

function renderMerchantResults({
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
    return (
      <div className="flex flex-col">
        {DEFAULT_MERCHANTS.map((r) => (
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
            key={r.brandId}
            onClick={() => onPick(r)}
            type="button"
          >
            <MerchantLogo
              className="size-5 shrink-0 rounded-sm"
              counterparties={null}
              deferUntilVisible={false}
              logoUrl={null}
              merchantName={r.name}
              website={r.domain}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
            {r.domain ? (
              <span className="shrink-0 text-muted-foreground text-xs">{r.domain}</span>
            ) : null}
          </button>
        ))}
        {hasMerchant ? (
          <>
            <div className="my-1 border-foreground/10 border-t" />
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
              onClick={onClear}
              type="button"
            >
              Clear merchant
            </button>
          </>
        ) : null}
      </div>
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

interface MerchantPickerListProps {
  merchantSearch: MerchantSearchState;
  hasMerchant: boolean;
  onSubmit: (args: { merchantName: string | null; website: string | null }) => void;
  /** Host hook fired right after a pick (e.g. close the popover). */
  onAfterSubmit?: () => void;
  /** Popover hosts want the search focused on open; menu sub-content does not. */
  autoFocusSearch?: boolean;
}

/**
 * Search + results body shared by the standalone {@link EditableMerchantLogo}
 * popover and the transactions table's context menu, so merchant editing looks
 * identical wherever it appears.
 */
export function MerchantPickerList({
  merchantSearch,
  hasMerchant,
  onSubmit,
  onAfterSubmit,
  autoFocusSearch = true,
}: MerchantPickerListProps) {
  const [query, setQuery] = useState("");

  function commit(args: { merchantName: string | null; website: string | null }) {
    onSubmit(args);
    setQuery("");
    merchantSearch.onQueryChange("");
    onAfterSubmit?.();
  }

  return (
    <>
      <div className="flex items-center px-2.5 py-1.5">
        <input
          autoFocus={autoFocusSearch}
          className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          maxLength={255}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            merchantSearch.onQueryChange(v);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          placeholder="Search merchant…"
          value={query}
        />
      </div>
      <div className="scrollbar-thin max-h-72 overflow-y-auto">
        {renderMerchantResults({
          hasMerchant,
          merchantSearch,
          onClear: () => commit({ merchantName: null, website: null }),
          onPick: (r) => commit({ merchantName: r.name, website: r.domain }),
          onUseTyped: () => commit({ merchantName: query.trim(), website: null }),
          query,
        })}
      </div>
    </>
  );
}

interface EditableMerchantLogoProps {
  transaction: Pick<TransactionListItem, "counterparties" | "logoUrl" | "merchantName" | "website">;
  merchantSearch: MerchantSearchState;
  onSubmit: (args: { merchantName: string | null; website: string | null }) => void;
}

export function EditableMerchantLogo({
  transaction,
  merchantSearch,
  onSubmit,
}: EditableMerchantLogoProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          merchantSearch.onQueryChange("");
        }
      }}
      open={open}
    >
      <PopoverTrigger
        render={
          <button
            aria-label="Edit merchant logo"
            className="group relative size-12 shrink-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            type="button"
          >
            <MerchantLogo
              className="size-12 shrink-0"
              counterparties={transaction.counterparties}
              deferUntilVisible={false}
              logoUrl={transaction.logoUrl}
              merchantName={transaction.merchantName}
              website={transaction.website}
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
              <HugeiconsIcon className="size-5 text-white" icon={Edit02Icon} strokeWidth={2} />
            </span>
          </button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-0 bg-popover p-1 dark:bg-popover">
        <MerchantPickerList
          hasMerchant={Boolean(transaction.merchantName)}
          merchantSearch={merchantSearch}
          onAfterSubmit={() => setOpen(false)}
          onSubmit={onSubmit}
        />
      </PopoverContent>
    </Popover>
  );
}
