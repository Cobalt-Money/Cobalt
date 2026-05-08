import { Toggle } from "@cobalt-web/ui/components/toggle";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { Activity03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  autoOpen,
  onClose,
}: {
  value: StatusFilterValue;
  onChange: (next: StatusFilterValue) => void;
  autoOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(autoOpen ?? false);
  const isActive = value !== "all";
  const triggerLabel = isActive ? `Status: ${LABELS[value]}` : "Status";

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          onClose?.();
        }
      }}
      open={open}
    >
      <PopoverTrigger
        render={<Toggle variant="subtle" pressed={isActive} size="sm" type="button" />}
      >
        <HugeiconsIcon className="size-3.5" icon={Activity03Icon} />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Search status..." />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {OPTIONS.map((option) => (
                <CommandItem
                  data-checked={option === value}
                  key={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  value={LABELS[option]}
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
