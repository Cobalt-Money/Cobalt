import { CobaltToggle, cobaltToggleSubtleChrome } from "@cobalt-web/ui/cobalt/toggle";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { BankIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";

import { InstitutionLogo } from "../../logos/institution-logo";

export interface BankOption {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
}

export function BankFilter({
  value,
  options,
  onChange,
}: {
  value: readonly string[];
  options: readonly BankOption[];
  onChange: (next: readonly string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value.length > 0;
  let triggerLabel = "Bank";
  if (isActive) {
    if (value.length === 1) {
      const name = options.find((o) => o.id === value[0])?.name ?? "1 selected";
      triggerLabel = `Bank: ${name}`;
    } else {
      triggerLabel = `Bank: ${value.length}`;
    }
  }

  const selected = useMemo(() => new Set(value), [value]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <CobaltToggle
            className={cobaltToggleSubtleChrome}
            pressed={isActive}
            size="sm"
            type="button"
          />
        }
      >
        <HugeiconsIcon className="size-3.5" icon={BankIcon} />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search banks..." />
          <CommandList>
            <CommandEmpty>No banks connected.</CommandEmpty>
            {isActive ? (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange([]);
                  }}
                  value="__clear__"
                >
                  <span className="text-muted-foreground">Clear</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.id);
                return (
                  <CommandItem
                    data-checked={isSelected}
                    key={option.id}
                    onSelect={() => {
                      const next = new Set(selected);
                      if (isSelected) {
                        next.delete(option.id);
                      } else {
                        next.add(option.id);
                      }
                      onChange([...next]);
                    }}
                    value={`${option.name}-${option.id}`}
                  >
                    <InstitutionLogo
                      institutionLogo={option.logo}
                      institutionName={option.name}
                      institutionUrl={option.url}
                    />
                    <span className="min-w-0 truncate">{option.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
