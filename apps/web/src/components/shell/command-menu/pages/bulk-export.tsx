import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";
import type { ExportFormat } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { Download02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface Props {
  /** Fired with the chosen export format. Parent owns the actual export side-effect. */
  onSelect: (format: ExportFormat) => void;
}

export function BulkExportPage({ onSelect }: Props) {
  return (
    <>
      <CommandEmpty>No formats found.</CommandEmpty>
      <CommandGroup heading="Export format">
        <CommandItem
          keywords={["csv", "comma", "spreadsheet"]}
          onSelect={() => onSelect("csv")}
          value="CSV"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Download02Icon}
            strokeWidth={2}
          />
          CSV
        </CommandItem>
        <CommandItem
          keywords={["xlsx", "excel", "spreadsheet"]}
          onSelect={() => onSelect("xlsx")}
          value="XLSX"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Download02Icon}
            strokeWidth={2}
          />
          XLSX (Excel)
        </CommandItem>
      </CommandGroup>
    </>
  );
}
