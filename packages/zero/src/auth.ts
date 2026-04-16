import type { schema } from "./schema.js";

export type Context =
  | {
      userId: string;
    }
  | undefined;

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    schema: typeof schema;
    context: Context;
  }
}
