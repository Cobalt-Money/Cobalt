import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import type { TagOption } from "@cobalt-web/ui/cobalt/transactions/tags/tag-picker";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useCallback, useMemo } from "react";
import { useMutator } from "./use-mutator";

/** Active (not archived) tags shaped for the picker. */
export function useTagOptions(): {
  options: readonly TagOption[];
  isLoading: boolean;
} {
  const [data] = useQuery(queries.tags.list());
  const options = useMemo<readonly TagOption[]>(
    () =>
      data
        .filter((t) => t.archivedAt === null && isTagColor(t.color))
        .map((t) => ({
          color: t.color as TagColor,
          id: t.id,
          name: t.name,
          transactionCount: t.transactionTags?.length ?? 0,
        })),
    [data],
  );
  return { isLoading: false, options };
}

export function useCreateTag() {
  const run = useMutator();
  const mutate = useCallback(
    (input: { name: string; color: TagColor }): Promise<TagOption> => {
      const id = crypto.randomUUID();
      run(
        (m) => m.tags.create({ color: input.color, id, name: input.name }),
        "Couldn't create tag.",
      );
      return Promise.resolve({ color: input.color, id, name: input.name });
    },
    [run],
  );
  return { isPending: false, mutateAsync: mutate };
}

export function useUpdateTag() {
  const run = useMutator();
  const mutate = useCallback(
    (input: { tagId: string; body: { name?: string; color?: TagColor; archived?: boolean } }) => {
      run(
        (m) =>
          m.tags.update({
            archived: input.body.archived,
            color: input.body.color,
            name: input.body.name,
            tagId: input.tagId,
          }),
        { silent: true },
      );
    },
    [run],
  );
  return { mutate };
}

export function useDeleteTag() {
  const run = useMutator();
  const mutate = useCallback(
    (tagId: string) => {
      run((m) => m.tags.delete({ tagId }), { silent: true });
    },
    [run],
  );
  return { mutate };
}

export function useTransactionTagIds(transactionId: string | undefined) {
  const [rows] = useQuery(queries.tags.forTransaction({ transactionId: transactionId ?? "" }));
  const data = useMemo(() => rows.map((r) => r.tagId), [rows]);
  return { data };
}

export function useSetTransactionTags() {
  const run = useMutator();
  const mutate = useCallback(
    (
      input: { transactionId: string; tagIds: string[] },
      options?: { onError?: (err: unknown) => void },
    ) => {
      run(
        (m) =>
          m.tags.setTransactionTags({
            editId: crypto.randomUUID(),
            tagIds: input.tagIds,
            transactionId: input.transactionId,
          }),
        options?.onError
          ? { onError: (err) => options.onError?.(new Error(err.message)) }
          : { silent: true },
      );
    },
    [run],
  );
  return { mutate };
}

export function useBulkApplyTags() {
  const run = useMutator();
  const mutate = useCallback(
    async (input: { transactionIds: string[]; addTagIds?: string[]; removeTagIds?: string[] }) => {
      const handle = run(
        (m) =>
          m.tags.bulkApply({
            addTagIds: input.addTagIds ?? [],
            editIds: input.transactionIds.map(() => crypto.randomUUID()),
            removeTagIds: input.removeTagIds ?? [],
            transactionIds: input.transactionIds,
          }),
        { silent: true },
      );
      const result = await handle.server;
      if (result.type === "error") {
        throw new Error(result.error.message);
      }
    },
    [run],
  );
  return { mutateAsync: mutate };
}
