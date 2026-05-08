import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { mutators, queries } from "@cobalt-web/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useCallback } from "react";

export interface CategoryRow {
  id: string;
  name: string;
  iconKey: string;
  groupId: string;
  hidden: boolean;
  order: number;
  systemKey: string | null;
  excludeFromInsights: boolean;
  group?: GroupRow | null;
}

export interface GroupRow {
  id: string;
  name: string;
  order: number;
  systemKey: string | null;
}

/** All non-deleted cats incl hidden — settings/management view. */
export function useAllCategories(): { data: readonly CategoryRow[] } {
  const [raw] = useQuery(queries.categories.listAll());
  return { data: raw as unknown as readonly CategoryRow[] };
}

/** All non-deleted groups for the user. */
export function useCategoryGroups(): { data: readonly GroupRow[] } {
  const [raw] = useQuery(queries.categories.listGroups());
  return { data: raw as unknown as readonly GroupRow[] };
}

function fireAndForget(
  server: Promise<{ type: "success" } | { type: "error"; error: { message: string } }>,
  fallback: string,
) {
  void (async () => {
    try {
      const result = await server;
      if (result.type === "error") {
        cobaltToast.error(result.error.message || fallback);
      }
    } catch (error) {
      cobaltToast.error(error instanceof Error ? error.message : fallback);
    }
  })();
}

export function useCreateCategory() {
  const zero = useZero();
  return useCallback(
    (input: {
      name: string;
      iconKey: string;
      groupId: string;
      excludeFromInsights?: boolean;
    }): string => {
      const id = crypto.randomUUID();
      const { server } = zero.mutate(mutators.categories.create({ id, ...input }));
      fireAndForget(server, "Couldn't create category.");
      return id;
    },
    [zero],
  );
}

export function useUpdateCategory() {
  const zero = useZero();
  return useCallback(
    (input: {
      categoryId: string;
      name?: string;
      iconKey?: string;
      groupId?: string;
      hidden?: boolean;
      excludeFromInsights?: boolean;
    }) => {
      const { server } = zero.mutate(mutators.categories.update(input));
      fireAndForget(server, "Couldn't update category.");
    },
    [zero],
  );
}

export function useHideCategory() {
  const zero = useZero();
  return useCallback(
    (input: { categoryId: string; reassignTo?: string | null }) => {
      const { server } = zero.mutate(mutators.categories.hide(input));
      fireAndForget(server, "Couldn't hide category.");
    },
    [zero],
  );
}

export function useDeleteCategory() {
  const zero = useZero();
  return useCallback(
    (categoryId: string) => {
      const { server } = zero.mutate(mutators.categories.delete({ categoryId }));
      fireAndForget(server, "Couldn't delete category.");
    },
    [zero],
  );
}

export function useCreateGroup() {
  const zero = useZero();
  return useCallback(
    (name: string): string => {
      const id = crypto.randomUUID();
      const { server } = zero.mutate(mutators.categories.createGroup({ id, name }));
      fireAndForget(server, "Couldn't create group.");
      return id;
    },
    [zero],
  );
}

export function useUpdateGroup() {
  const zero = useZero();
  return useCallback(
    (input: { groupId: string; name?: string }) => {
      const { server } = zero.mutate(mutators.categories.updateGroup(input));
      fireAndForget(server, "Couldn't update group.");
    },
    [zero],
  );
}

export function useDeleteGroup() {
  const zero = useZero();
  return useCallback(
    (groupId: string) => {
      const { server } = zero.mutate(mutators.categories.deleteGroup({ groupId }));
      fireAndForget(server, "Couldn't delete group.");
    },
    [zero],
  );
}

export function useReorderCategories() {
  const zero = useZero();
  return useCallback(
    (input: { groupId: string; categoryIds: string[] }) => {
      const { server } = zero.mutate(mutators.categories.reorder(input));
      fireAndForget(server, "Couldn't reorder categories.");
    },
    [zero],
  );
}

export function useReorderGroups() {
  const zero = useZero();
  return useCallback(
    (groupIds: string[]) => {
      const { server } = zero.mutate(mutators.categories.reorderGroups({ groupIds }));
      fireAndForget(server, "Couldn't reorder groups.");
    },
    [zero],
  );
}
