import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

export interface GroupPickerOption {
  id: string;
  name: string;
}

interface GroupPickerListProps {
  options: readonly GroupPickerOption[];
  selectedKey: string | null;
  onSelect: (option: GroupPickerOption) => void;
  autoFocusSearch?: boolean;
}

/**
 * Search + flat group list. Host-agnostic body shared by the standalone
 * {@link GroupPicker} popover. Mirrors CategoryPickerList for visual parity.
 */
export function GroupPickerList({
  options,
  selectedKey,
  onSelect,
  autoFocusSearch = true,
}: GroupPickerListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") {
      return options;
    }
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <>
      <div className="flex items-center px-2.5 py-1.5">
        <input
          autoFocus={autoFocusSearch}
          className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          placeholder="Search groups…"
          value={query}
        />
      </div>
      <div className="scrollbar-thin max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">No groups</div>
        ) : (
          filtered.map((opt) => (
            <GroupRow
              isSelected={opt.id === selectedKey}
              key={opt.id}
              onSelect={() => {
                onSelect(opt);
                setQuery("");
              }}
              option={opt}
            />
          ))
        )}
      </div>
    </>
  );
}

interface GroupPickerProps {
  trigger: ReactElement;
  options: readonly GroupPickerOption[];
  selectedKey: string | null;
  onSelect: (option: GroupPickerOption) => void;
}

/**
 * Flat group picker. Mirrors {@link CategoryPicker} layout. Closes on select.
 */
export function GroupPicker({ trigger, options, selectedKey, onSelect }: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto gap-0 bg-popover p-1 dark:bg-popover">
        <GroupPickerList
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

function GroupRow({
  option,
  isSelected,
  onSelect,
}: {
  option: GroupPickerOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
        isSelected && "bg-input/30 font-medium",
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0 truncate text-foreground">{option.name}</span>
    </button>
  );
}
