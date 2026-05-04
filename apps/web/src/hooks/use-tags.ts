import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import type { TagOption } from "@cobalt-web/ui/cobalt/transactions/tags/tag-picker";
import { mutators, queries } from "@cobalt-web/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useCallback, useMemo } from "react";

interface TagRow {
  id: string;
  name: string;
  color: string;
  archivedAt: number | null;
  transactionTags?: readonly { tagId: string }[];
}

interface TransactionTagRow {
  tagId: string;
  transactionId: string;
}

/** Active + archived tags for the signed-in user (Zero replicated). */
export function useTags() {
  const [rawTags] = useQuery(queries.tags.list());
  const tags = rawTags as unknown as TagRow[];
  return { data: tags };
}

/** Active (not archived) tags shaped for the picker. */
export function useTagOptions(): {
  options: readonly TagOption[];
  isLoading: boolean;
} {
  const { data } = useTags();
  const options = useMemo<readonly TagOption[]>(
    () =>
      data
        .filter((t) => t.archivedAt === null && isTagColor(t.color))
        .map((t) => ({ color: t.color as TagColor, id: t.id, name: t.name })),
    [data],
  );
  return { isLoading: false, options };
}

export function useCreateTag() {
  const zero = useZero();
  const mutate = useCallback(
    (input: { name: string; color: TagColor }): Promise<TagOption> => {
      const id = crypto.randomUUID();
      const { server } = zero.mutate(
        mutators.tags.create({ color: input.color, id, name: input.name }),
      );
      // Fire-and-forget: optimistic client run already inserted the row.
      // Surface server rejections via toast without blocking the caller.
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            cobaltToast.error(result.error.message || "Couldn't create tag.");
          }
        } catch (error) {
          console.error("[tags.create]", error);
          cobaltToast.error("Couldn't create tag. Please try again.");
        }
      })();
      return Promise.resolve({ color: input.color, id, name: input.name });
    },
    [zero],
  );
  return { isPending: false, mutateAsync: mutate };
}

export function useUpdateTag() {
  const zero = useZero();
  const mutate = useCallback(
    (input: { tagId: string; body: { name?: string; color?: TagColor; archived?: boolean } }) => {
      const { server } = zero.mutate(
        mutators.tags.update({
          archived: input.body.archived,
          color: input.body.color,
          name: input.body.name,
          tagId: input.tagId,
        }),
      );
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[tags.update]", error);
        }
      })();
    },
    [zero],
  );
  return { mutate };
}

export function useDeleteTag() {
  const zero = useZero();
  const mutate = useCallback(
    (tagId: string) => {
      const { server } = zero.mutate(mutators.tags.delete({ tagId }));
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[tags.delete]", error);
        }
      })();
    },
    [zero],
  );
  return { mutate };
}

export function useTransactionTagIds(transactionId: string | undefined) {
  const [raw] = useQuery(queries.tags.forTransaction({ transactionId: transactionId ?? "" }));
  const rows = raw as unknown as TransactionTagRow[];
  const data = useMemo(() => rows.map((r) => r.tagId), [rows]);
  return { data };
}

export function useSetTransactionTags() {
  const zero = useZero();
  const mutate = useCallback(
    (
      input: { transactionId: string; tagIds: string[] },
      options?: { onError?: (err: unknown) => void },
    ) => {
      const { server } = zero.mutate(
        mutators.tags.setTransactionTags({
          editId: crypto.randomUUID(),
          tagIds: input.tagIds,
          transactionId: input.transactionId,
        }),
      );
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            options?.onError?.(new Error(result.error.message));
          }
        } catch (error) {
          options?.onError?.(error);
        }
      })();
    },
    [zero],
  );
  return { mutate };
}

export function useBulkApplyTags() {
  const zero = useZero();
  const mutate = useCallback(
    async (input: { transactionIds: string[]; addTagIds?: string[]; removeTagIds?: string[] }) => {
      const { server } = zero.mutate(
        mutators.tags.bulkApply({
          addTagIds: input.addTagIds ?? [],
          editIds: input.transactionIds.map(() => crypto.randomUUID()),
          removeTagIds: input.removeTagIds ?? [],
          transactionIds: input.transactionIds,
        }),
      );
      const result = await server;
      if (result.type === "error") {
        throw new Error(result.error.message);
      }
    },
    [zero],
  );
  return { mutateAsync: mutate };
}
