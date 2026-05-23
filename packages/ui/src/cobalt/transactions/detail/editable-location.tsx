import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import { Location01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import type { GeocodeSearchState } from "../add-transaction-dialog";

type LocationJson = NonNullable<TransactionResponse["location"]>;

export interface GeocodeResult {
  displayName: string;
  location: LocationJson;
}

interface EditableLocationProps {
  isOverridden: boolean;
  loading: boolean;
  location: LocationJson | null;
  onQueryChange: (query: string) => void;
  onReset: () => void;
  onSubmit: (location: LocationJson) => void;
  results: GeocodeResult[];
}

interface LocationPickerListProps {
  locationSearch: GeocodeSearchState;
  onSubmit: (location: LocationJson) => void;
  /** Host hook fired right after a pick (e.g. close the popover/menu). */
  onAfterSubmit?: () => void;
  /** Popover hosts want the search focused on open; menu sub-content does not. */
  autoFocusSearch?: boolean;
}

/**
 * Search + results body for picking a transaction location. Used by the
 * transactions table's context menu; mirrors the category/tag/merchant picker
 * lists so location editing looks consistent.
 */
export function LocationPickerList({
  locationSearch,
  onSubmit,
  onAfterSubmit,
  autoFocusSearch = true,
}: LocationPickerListProps) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  function renderResults() {
    if (trimmed.length < 2) {
      return (
        <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Type to search</div>
      );
    }
    if (locationSearch.loading && locationSearch.results.length === 0) {
      return (
        <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">Searching…</div>
      );
    }
    if (locationSearch.results.length === 0) {
      return (
        <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">No matches</div>
      );
    }
    return locationSearch.results.map((r) => (
      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40"
        key={r.displayName}
        onClick={() => {
          onSubmit(r.location);
          setQuery("");
          locationSearch.onQueryChange("");
          onAfterSubmit?.();
        }}
        type="button"
      >
        <span className="min-w-0 truncate text-foreground">{r.displayName}</span>
      </button>
    ));
  }

  return (
    <>
      <div className="flex items-center px-2.5 py-1.5">
        <input
          autoComplete="off"
          autoFocus={autoFocusSearch}
          className="min-w-0 flex-1 cursor-text bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            locationSearch.onQueryChange(v);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          placeholder="Search location…"
          spellCheck={false}
          value={query}
        />
      </div>
      <div className="scrollbar-thin max-h-72 overflow-y-auto">{renderResults()}</div>
    </>
  );
}

function summarize(loc: LocationJson | null): string {
  if (!loc) {
    return "";
  }
  return [loc.address, loc.city, loc.region].filter(Boolean).join(", ");
}

export function EditableLocation({
  isOverridden,
  loading,
  location,
  onQueryChange,
  onReset,
  onSubmit,
  results,
}: EditableLocationProps) {
  const seeded = summarize(location);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(r: GeocodeResult) {
    onSubmit(r.location);
    onQueryChange("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="flex items-center gap-1 text-base" ref={wrapRef}>
      <div className="relative flex flex-1 items-center gap-2.5">
        <span className="flex size-5 shrink-0 items-center justify-center">
          <HugeiconsIcon
            className="size-5 text-muted-foreground"
            icon={Location01Icon}
            strokeWidth={2}
          />
        </span>
        <input
          aria-label="Transaction location"
          autoComplete="off"
          className="min-w-0 flex-1 cursor-text bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          defaultValue={seeded}
          key={seeded}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (inputRef.current) {
                inputRef.current.value = seeded;
              }
              onQueryChange("");
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Add location"
          ref={inputRef}
          spellCheck={false}
          type="text"
        />
        {open ? (
          <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[20rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
            {loading && results.length === 0 ? (
              <div className="px-2 py-2 text-muted-foreground text-xs">Searching…</div>
            ) : null}
            {!loading && results.length === 0 ? (
              <div className="px-2 py-2 text-muted-foreground text-xs">No matches</div>
            ) : null}
            {results.map((r) => (
              <button
                className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                key={r.displayName}
                onClick={() => pick(r)}
                type="button"
              >
                {r.displayName}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {isOverridden ? (
        <button
          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            onReset();
            onQueryChange("");
          }}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Refresh01Icon} strokeWidth={2} />
          Reset
        </button>
      ) : null}
    </div>
  );
}
