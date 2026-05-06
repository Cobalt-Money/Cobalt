import { ManageCategoriesForm } from "@cobalt-web/ui/cobalt/transactions/categories/manage-categories-form";
import type {
  ManageCategoriesCat,
  ManageCategoriesGroup,
} from "@cobalt-web/ui/cobalt/transactions/categories/manage-categories-form";
import { useMemo, useState } from "react";

import {
  useAllCategories,
  useCategoryGroups,
  useReorderCategories,
  useReorderGroups,
  useUpdateCategory,
  useUpdateGroup,
} from "@/hooks/use-categories";
import type { CategoryRow, GroupRow } from "@/hooks/use-categories";

import { CategoryFormDialog } from "./category-form-dialog";
import type { CategoryFormInitial } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { DeleteGroupDialog } from "./delete-group-dialog";
import { GroupFormDialog } from "./group-form-dialog";

interface SubDialogState {
  catForm: { open: boolean; initial: CategoryFormInitial | null };
  groupForm: { open: boolean; initial: GroupRow | null };
  deleteCat: CategoryRow | null;
  deleteGroup: GroupRow | null;
}

const INITIAL_SUB: SubDialogState = {
  catForm: { initial: null, open: false },
  deleteCat: null,
  deleteGroup: null,
  groupForm: { initial: null, open: false },
};

/** Hook returning all data + handlers needed to drive the manage-categories Form. */
export function useManageCategoriesProps() {
  const { data: categories } = useAllCategories();
  const { data: groups } = useCategoryGroups();
  const updateCat = useUpdateCategory();
  const updateGroup = useUpdateGroup();
  const reorderCats = useReorderCategories();
  const reorderGroups = useReorderGroups();

  const [sub, setSub] = useState<SubDialogState>(INITIAL_SUB);

  const sortedGroups = useMemo<readonly ManageCategoriesGroup[]>(
    () => [...groups].toSorted((a, b) => a.order - b.order),
    [groups],
  );

  const catsByGroup = useMemo(() => {
    const map = new Map<string, ManageCategoriesCat[]>();
    for (const c of categories) {
      const arr = map.get(c.groupId) ?? [];
      arr.push(c);
      map.set(c.groupId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.order - b.order);
    }
    return map as ReadonlyMap<string, readonly ManageCategoriesCat[]>;
  }, [categories]);

  const formProps = {
    catsByGroup,
    groups: sortedGroups,
    onChangeIcon: (categoryId: string, iconKey: string) => updateCat({ categoryId, iconKey }),
    onCreateCategory: (groupId?: string) =>
      setSub((s) => ({
        ...s,
        catForm: { initial: groupId ? { groupId } : null, open: true },
      })),
    onCreateGroup: () => setSub((s) => ({ ...s, groupForm: { initial: null, open: true } })),
    onDeleteCategory: (c: ManageCategoriesCat) =>
      setSub((s) => ({ ...s, deleteCat: c as CategoryRow })),
    onDeleteGroup: (g: ManageCategoriesGroup) =>
      setSub((s) => ({ ...s, deleteGroup: g as GroupRow })),
    onMoveCategoryToGroup: (categoryId: string, groupId: string) =>
      updateCat({ categoryId, groupId }),
    onRenameCategory: (categoryId: string, name: string) => updateCat({ categoryId, name }),
    onRenameGroup: (groupId: string, name: string) => updateGroup({ groupId, name }),
    onReorderCategories: (groupId: string, categoryIds: string[]) =>
      reorderCats({ categoryIds, groupId }),
    onReorderGroups: (groupIds: string[]) => reorderGroups(groupIds),
    onToggleExcludeFromInsights: (c: ManageCategoriesCat, excluded: boolean) =>
      updateCat({ categoryId: c.id, excludeFromInsights: excluded }),
    onToggleHidden: (c: ManageCategoriesCat, hidden: boolean) =>
      updateCat({ categoryId: c.id, hidden }),
  };

  const subDialogs = (
    <>
      <CategoryFormDialog
        groups={sortedGroups as readonly GroupRow[]}
        initial={sub.catForm.initial}
        onOpenChange={(open) =>
          setSub((s) => ({
            ...s,
            catForm: { initial: open ? s.catForm.initial : null, open },
          }))
        }
        open={sub.catForm.open}
      />
      <GroupFormDialog
        initial={sub.groupForm.initial}
        onOpenChange={(open) =>
          setSub((s) => ({
            ...s,
            groupForm: { initial: open ? s.groupForm.initial : null, open },
          }))
        }
        open={sub.groupForm.open}
      />
      <DeleteCategoryDialog
        category={sub.deleteCat}
        onOpenChange={(open) => {
          if (!open) {
            setSub((s) => ({ ...s, deleteCat: null }));
          }
        }}
        open={sub.deleteCat !== null}
      />
      <DeleteGroupDialog
        group={sub.deleteGroup}
        hasChildren={
          sub.deleteGroup ? (catsByGroup.get(sub.deleteGroup.id) ?? []).length > 0 : false
        }
        onOpenChange={(open) => {
          if (!open) {
            setSub((s) => ({ ...s, deleteGroup: null }));
          }
        }}
        open={sub.deleteGroup !== null}
      />
    </>
  );

  return { formProps, subDialogs };
}

/** Body-only — used by `/transactions/categories` route. */
export function ManageCategoriesEmbedded() {
  const { formProps, subDialogs } = useManageCategoriesProps();
  return (
    <>
      <ManageCategoriesForm {...formProps} />
      {subDialogs}
    </>
  );
}
