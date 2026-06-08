import { Icon } from "@cobalt-web/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { HStack } from "@cobalt-web/ui/components/stack";
import { Refresh01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

export type PaymentChannel = "in store" | "online" | "other";

interface EditablePaymentChannelProps {
  paymentChannel: PaymentChannel | null;
  isOverridden: boolean;
  onReset: () => void;
  onSubmit: (value: PaymentChannel) => void;
}

const OPTIONS = [
  { label: "In store", value: "in store" },
  { label: "Online", value: "online" },
  { label: "Other", value: "other" },
] as const satisfies readonly { label: string; value: PaymentChannel }[];

const LABEL_MAP: Record<PaymentChannel, string> = {
  "in store": "In store",
  online: "Online",
  other: "Other",
};

function formatLabel(value: PaymentChannel | null): string {
  return value ? LABEL_MAP[value] : "Unknown channel";
}

export function EditablePaymentChannel({
  paymentChannel,
  isOverridden,
  onReset,
  onSubmit,
}: EditablePaymentChannelProps) {
  const [open, setOpen] = useState(false);

  return (
    <HStack className="text-base" gap={1}>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <button
              aria-label="Edit payment channel"
              className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted"
              type="button"
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                <Icon className="text-muted-foreground" icon={ShoppingBag01Icon} size="md" />
              </span>
              <span className="text-foreground">{formatLabel(paymentChannel)}</span>
              {isOverridden ? (
                <span className="rounded-full bg-background px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                  Edited
                </span>
              ) : null}
            </button>
          }
        />
        <PopoverContent align="start" className="w-44 p-1">
          {OPTIONS.map((opt) => {
            const selected = opt.value === paymentChannel;
            return (
              <button
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                  selected ? "font-medium text-foreground" : "text-foreground/85"
                }`}
                key={opt.value}
                onClick={() => {
                  if (!selected) {
                    onSubmit(opt.value);
                  }
                  setOpen(false);
                }}
                type="button"
              >
                <span>{opt.label}</span>
                {selected ? <span aria-hidden>✓</span> : null}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      {isOverridden ? (
        <button
          aria-label="Reset payment channel"
          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onReset}
          type="button"
        >
          <Icon icon={Refresh01Icon} size="xs" />
        </button>
      ) : null}
    </HStack>
  );
}
