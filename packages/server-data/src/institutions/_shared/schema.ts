import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { institutionJsonbSelectRefinements } from "@cobalt-web/db/schema/providers/plaid/zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

/** Row schema from DB with JSONB refinements for `routing_numbers`. */
export const institutionRowSchema = createSelectSchema(institution, {
  ...institutionJsonbSelectRefinements,
});

export const institutionIdParamSchema = z.object({
  id: z.string(),
});

export type InstitutionIdParam = z.infer<typeof institutionIdParamSchema>;
