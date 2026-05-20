import type { queries, Row } from "@cobalt-web/zero";
import { useCallback } from "react";
import { useMutator } from "./use-mutator";

export type CategoryRow = Row<typeof queries.categories.list>;
export type GroupRow = Row<typeof queries.categories.listGroups>;

export function useCreateCategory() {
  const run = useMutator();
  return useCallback(
    (input: {
      name: string;
      iconKey: string;
      groupId: string;
      excludeFromInsights?: boolean;
    }): string => {
      const id = crypto.randomUUID();
      run((m) => m.categories.create({ id, ...input }), "Couldn't create category.");
      return id;
    },
    [run],
  );
}

export function useUpdateCategory() {
  const run = useMutator();
  return useCallback(
    (input: {
      categoryId: string;
      name?: string;
      iconKey?: string;
      groupId?: string;
      hidden?: boolean;
      excludeFromInsights?: boolean;
    }) => {
      run((m) => m.categories.update(input), "Couldn't update category.");
    },
    [run],
  );
}

export function useHideCategory() {
  const run = useMutator();
  return useCallback(
    (input: { categoryId: string; reassignTo?: string | null }) => {
      run((m) => m.categories.hide(input), "Couldn't hide category.");
    },
    [run],
  );
}

export function useDeleteCategory() {
  const run = useMutator();
  return useCallback(
    (categoryId: string) => {
      run((m) => m.categories.delete({ categoryId }), "Couldn't delete category.");
    },
    [run],
  );
}

export function useCreateGroup() {
  const run = useMutator();
  return useCallback(
    (name: string): string => {
      const id = crypto.randomUUID();
      run((m) => m.categories.createGroup({ id, name }), "Couldn't create group.");
      return id;
    },
    [run],
  );
}

export function useUpdateGroup() {
  const run = useMutator();
  return useCallback(
    (input: { groupId: string; name?: string }) => {
      run((m) => m.categories.updateGroup(input), "Couldn't update group.");
    },
    [run],
  );
}

export function useDeleteGroup() {
  const run = useMutator();
  return useCallback(
    (groupId: string) => {
      run((m) => m.categories.deleteGroup({ groupId }), "Couldn't delete group.");
    },
    [run],
  );
}

export function useReorderCategories() {
  const run = useMutator();
  return useCallback(
    (input: { groupId: string; categoryIds: string[] }) => {
      run((m) => m.categories.reorder(input), "Couldn't reorder categories.");
    },
    [run],
  );
}

export function useReorderGroups() {
  const run = useMutator();
  return useCallback(
    (groupIds: string[]) => {
      run((m) => m.categories.reorderGroups({ groupIds }), "Couldn't reorder groups.");
    },
    [run],
  );
}
