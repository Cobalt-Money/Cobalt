import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";
import type { queries, Row } from "@cobalt-web/zero";
import { useMemo } from "react";

type CategoryRow = Row<typeof queries.categories.list>;

interface Props {
  categories: readonly CategoryRow[];
  onSelect: (categoryId: string) => void;
}

export function BulkSetCategoryPage({ categories, onSelect }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, { groupName: string; items: CategoryRow[] }>();
    for (const c of categories) {
      if (c.hidden) {
        continue;
      }
      const groupName = c.group?.name ?? "Other";
      const key = `${c.group?.systemKey ?? "_custom"}::${groupName}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.items.push(c);
      } else {
        map.set(key, { groupName, items: [c] });
      }
    }
    return [...map.values()];
  }, [categories]);

  return (
    <>
      <CommandEmpty>No categories found.</CommandEmpty>
      {groups.map((group) => (
        <CommandGroup heading={group.groupName} key={group.groupName}>
          {group.items.map((cat) => {
            const icon = resolveCategoryIcon(cat.iconKey) ?? UNKNOWN_CATEGORY_ICON;
            return (
              <CommandItem
                key={cat.id}
                keywords={[group.groupName]}
                onSelect={() => onSelect(cat.id)}
                value={`${cat.name} ${group.groupName}`}
              >
                <CategoryIcon icon={icon} sizeClassName="size-5" />
                {cat.name}
              </CommandItem>
            );
          })}
        </CommandGroup>
      ))}
    </>
  );
}
