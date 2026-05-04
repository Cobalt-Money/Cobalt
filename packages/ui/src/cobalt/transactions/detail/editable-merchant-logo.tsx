import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { MerchantLogo } from "../../logos/merchant-logo";
import type { MerchantSearchState, MerchantSuggestionItem } from "../add-transaction-dialog";

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
        <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Type to search</div>
        {hasMerchant ? (
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
            onClick={onClear}
            type="button"
          >
            Clear merchant
          </button>
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
  const [query, setQuery] = useState("");

  return (
    <Popover
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
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
      <PopoverContent
        align="end"
        className="w-80 gap-0 bg-[oklch(0.949_0_0)] p-1 dark:bg-[oklch(0.29_0_0)]"
      >
        <div className="flex items-center px-2.5 py-1.5">
          <input
            autoFocus
            className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            maxLength={255}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              merchantSearch.onQueryChange(v);
            }}
            placeholder="Search merchant…"
            value={query}
          />
        </div>
        <div className="scrollbar-thin max-h-72 overflow-y-auto">
          {renderMerchantResults({
            hasMerchant: Boolean(transaction.merchantName),
            merchantSearch,
            onClear: () => {
              onSubmit({ merchantName: null, website: null });
              setOpen(false);
            },
            onPick: (r) => {
              onSubmit({ merchantName: r.name, website: r.domain });
              setOpen(false);
            },
            onUseTyped: () => {
              onSubmit({ merchantName: query.trim(), website: null });
              setOpen(false);
            },
            query,
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
