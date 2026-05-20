import { TagChip } from "@cobalt-web/ui/cobalt/transactions/tags/tag-chip";
import type { TagOption } from "@cobalt-web/ui/cobalt/transactions/tags/tag-picker";
import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";

interface Props {
  mode: "add" | "remove";
  options: readonly TagOption[];
  onSelect: (tagId: string, mode: "add" | "remove") => void;
}

export function BulkTagsPage({ mode, options, onSelect }: Props) {
  return (
    <>
      <CommandEmpty>No tags found.</CommandEmpty>
      <CommandGroup heading={mode === "add" ? "Add tag" : "Remove tag"}>
        {options.map((tag) => (
          <CommandItem key={tag.id} onSelect={() => onSelect(tag.id, mode)} value={tag.name}>
            <TagChip color={tag.color} name={tag.name} size="sm" />
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
