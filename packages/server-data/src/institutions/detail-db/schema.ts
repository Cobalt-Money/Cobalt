import type { z } from "@hono/zod-openapi";

import { institutionRowSchema } from "../_shared/schema.js";

/** Local `institution` row returned by GET `/db/{id}` and sync. */
export const institutionDbSchema = institutionRowSchema
  .pick({
    createdAt: true,
    id: true,
    logo: true,
    name: true,
    oauth: true,
    plaidInstitutionId: true,
    primaryColor: true,
    routingNumbers: true,
    status: true,
    updatedAt: true,
    url: true,
  })
  .openapi("InstitutionDb");

export type InstitutionDb = z.infer<typeof institutionDbSchema>;
