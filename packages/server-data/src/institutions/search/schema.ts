import { z } from "@hono/zod-openapi";

import { institutionRowSchema } from "../_shared/schema.js";

export const searchInstitutionsSchema = z.object({
  query: z.string().optional(),
});

export const institutionSearchResultSchema = z
  .object({
    id: z.string(),
    logo: institutionRowSchema.shape.logo,
    name: institutionRowSchema.shape.name,
    primary_color: institutionRowSchema.shape.primaryColor,
    url: institutionRowSchema.shape.url,
  })
  .openapi("Institution");

export const searchInstitutionsResponseSchema = z
  .object({
    institutions: z.array(institutionSearchResultSchema),
  })
  .openapi("SearchInstitutionsResponse");

export type SearchInstitutions = z.infer<typeof searchInstitutionsSchema>;
export type InstitutionSearchResult = z.infer<typeof institutionSearchResultSchema>;
export type SearchInstitutionsResponse = z.infer<typeof searchInstitutionsResponseSchema>;
