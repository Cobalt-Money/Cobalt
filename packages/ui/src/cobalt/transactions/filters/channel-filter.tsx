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
import { StoreLocation01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

export type ChannelFilterValue = "all" | "in_store" | "online" | "other";

const LABELS: Record<ChannelFilterValue, string> = {
  all: "All",
  in_store: "In store",
  online: "Online",
  other: "Other",
};

const OPTIONS: readonly ChannelFilterValue[] = ["all", "in_store", "online", "other"];

export function ChannelFilter({
  value,
  onChange,
  autoOpen,
  onClose,
}: {
  value: ChannelFilterValue;
  onChange: (next: ChannelFilterValue) => void;
  autoOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(autoOpen ?? false);
  const isActive = value !== "all";
  const triggerLabel = isActive ? `Channel: ${LABELS[value]}` : "Channel";

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
        <HugeiconsIcon className="size-3.5" icon={StoreLocation01Icon} />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Search channel..." />
          <CommandList>
            <CommandEmpty>No channel found.</CommandEmpty>
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

export const CHANNEL_LABELS = LABELS;
export const CHANNEL_OPTIONS = OPTIONS;
