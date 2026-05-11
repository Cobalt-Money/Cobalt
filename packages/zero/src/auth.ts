import type { schema } from "./schema.js";

export type Context =
  | {
      userId: string;
    }
  | undefined;

/** UUID that never matches real rows — `where("userId", ctx?.userId ?? NO_MATCH_ID)` returns empty set for unauth callers. */
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    schema: typeof schema;
    context: Context;
  }
}
