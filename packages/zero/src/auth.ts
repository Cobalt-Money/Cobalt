import type { schema } from "./schema.js";

export type Context =
  | {
      userId: string;
    }
  | undefined;

/** UUID that never matches real rows — `where("userId", ctx?.userId ?? NO_MATCH_ID)` returns empty set for unauth callers. */
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Canonical ownership gate for Zero mutators. Pass any ZQL fetcher that
 * returns a row with a `userId` column. Throws if the caller is unauthenticated,
 * the row doesn't exist, or the row belongs to another user. Returns the row
 * + verified `userId` so callers can use the data without a second query.
 *
 * Why: mutator `args` are client-controlled, so any id passed in must be
 * verified against `ctx.userId` (server-set) before mutating. See zbugs
 * `assertIsCreatorOrAdmin` for the reference pattern.
 */
export async function requireOwned<R extends { userId: string }>(
  ctx: Context,
  fetch: () => Promise<R | null | undefined>,
): Promise<{ row: R; userId: string }> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const row = await fetch();
  if (!row || row.userId !== userId) {
    throw new Error("Not found");
  }
  return { row, userId };
}

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    schema: typeof schema;
    context: Context;
  }
}
