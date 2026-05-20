import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";
import {
  Copy01Icon,
  Download02Icon,
  EyeIcon,
  Folder01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface Props {
  count: number;
  onSetCategory: () => void;
  onAddTags: () => void;
  onRemoveTags: () => void;
  onSetExcluded: (excluded: boolean) => void;
  onCopy: () => void;
  onExport: () => void;
}

export function BulkActionsPage({
  count,
  onSetCategory,
  onAddTags,
  onRemoveTags,
  onSetExcluded,
  onCopy,
  onExport,
}: Props) {
  return (
    <>
      <CommandEmpty>No actions found.</CommandEmpty>
      <CommandGroup heading={`${count} transactions`}>
        <CommandItem
          keywords={["category", "categorize"]}
          onSelect={onSetCategory}
          value="Set category"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Folder01Icon}
            strokeWidth={2}
          />
          Set category…
        </CommandItem>
        <CommandItem keywords={["tag", "label", "add"]} onSelect={onAddTags} value="Add tags">
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Tag01Icon}
            strokeWidth={2}
          />
          Add tags…
        </CommandItem>
        <CommandItem
          keywords={["tag", "label", "remove"]}
          onSelect={onRemoveTags}
          value="Remove tags"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Tag01Icon}
            strokeWidth={2}
          />
          Remove tags…
        </CommandItem>
        <CommandItem
          keywords={["exclude", "spending", "insights", "hide"]}
          onSelect={() => onSetExcluded(true)}
          value="Exclude from spending"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={EyeIcon}
            strokeWidth={2}
          />
          Exclude from spending
        </CommandItem>
        <CommandItem
          keywords={["include", "spending", "insights", "show"]}
          onSelect={() => onSetExcluded(false)}
          value="Include in spending"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={EyeIcon}
            strokeWidth={2}
          />
          Include in spending
        </CommandItem>
        <CommandItem
          keywords={["copy", "clipboard", "paste", "tsv"]}
          onSelect={onCopy}
          value="Copy"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Copy01Icon}
            strokeWidth={2}
          />
          Copy as table
        </CommandItem>
        <CommandItem
          keywords={["export", "download", "csv", "xlsx", "excel"]}
          onSelect={onExport}
          value="Export"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={Download02Icon}
            strokeWidth={2}
          />
          Export…
        </CommandItem>
      </CommandGroup>
    </>
  );
}
