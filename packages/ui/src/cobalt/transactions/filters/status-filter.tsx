import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import { Command, CommandGroup, CommandItem, CommandList } from "@cobalt-web/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { useState } from "react";

export type StatusFilterValue = "all" | "pending" | "posted";

const LABELS: Record<StatusFilterValue, string> = {
  all: "All",
  pending: "Pending",
  posted: "Posted",
};

const OPTIONS: readonly StatusFilterValue[] = ["all", "pending", "posted"];

export function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilterValue;
  onChange: (next: StatusFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value !== "all";
  const triggerLabel = isActive ? `Status: ${LABELS[value]}` : "Status";

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={<CobaltToggle pressed={isActive} size="sm" type="button" variant="outline" />}
      >
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {OPTIONS.map((option) => (
                <CommandItem
                  data-checked={option === value}
                  key={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  value={option}
                >
                  {LABELS[option]}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
