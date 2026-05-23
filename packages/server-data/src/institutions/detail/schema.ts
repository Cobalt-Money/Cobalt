import { z } from "@hono/zod-openapi";

import { institutionRowSchema } from "../_shared/schema.js";

/** Full institution from Plaid `institutionsGetById` (mapped). `status` may be non-string on Plaid. */
export const institutionDetailSchema = z
  .object({
    id: z.string(),
    logo: institutionRowSchema.shape.logo,
    name: institutionRowSchema.shape.name,
    oauth: institutionRowSchema.shape.oauth,
    primary_color: institutionRowSchema.shape.primaryColor,
    routing_numbers: z.array(z.string()),
    status: z.unknown().nullable(),
    url: institutionRowSchema.shape.url,
  })
  .openapi("InstitutionDetail");

export type InstitutionDetail = z.infer<typeof institutionDetailSchema>;
