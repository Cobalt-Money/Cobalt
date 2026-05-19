import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { Calendar03Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { formatDateStringLong } from "../lib/helpers";

interface EditableDateProps {
  dateIso: string;
  isOverridden: boolean;
  onReset: () => void;
  onSubmit: (dateIso: string) => void;
}

function isoToDateOnly(iso: string): Date {
  const day = String(iso).split("T")[0] ?? String(iso);
  return new Date(`${day}T12:00:00.000Z`);
}

function dateToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function EditableDate({ dateIso, isOverridden, onReset, onSubmit }: EditableDateProps) {
  const [open, setOpen] = useState(false);
  const selected = isoToDateOnly(dateIso);

  return (
    <div className="flex items-center gap-1 text-base">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <button
              aria-label="Edit date"
              className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted"
              type="button"
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                <HugeiconsIcon
                  className="size-5 text-muted-foreground"
                  icon={Calendar03Icon}
                  strokeWidth={2}
                />
              </span>
              <span className="text-foreground">{formatDateStringLong(dateIso)}</span>
              {isOverridden ? (
                <span className="rounded-full bg-background px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                  Edited
                </span>
              ) : null}
            </button>
          }
        />
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="single"
            onSelect={(date) => {
              if (!date) {
                return;
              }
              const iso = dateToIso(date);
              if (iso !== dateIso) {
                onSubmit(iso);
              }
              setOpen(false);
            }}
            selected={selected}
          />
        </PopoverContent>
      </Popover>
      {isOverridden ? (
        <button
          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onReset}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Refresh01Icon} strokeWidth={2} />
          Reset
        </button>
      ) : null}
    </div>
  );
}
