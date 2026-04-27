import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { institutionJsonbSelectRefinements } from "@cobalt-web/db/schema/providers/plaid/zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Row schema from DB (JSONB refinements for `routing_numbers`) ────

const institutionRowSchema = createSelectSchema(institution, {
  ...institutionJsonbSelectRefinements,
});

// ── Param / query schemas ───────────────────────────────────────────

export const institutionSearchQuerySchema = z.object({
  query: z.string().optional(),
});

export const institutionIdParamSchema = z.object({
  id: z.string(),
});

export const institutionSyncBodySchema = z.object({
  institutionId: z.string(),
});

// ── Response schemas: Plaid proxy (search / detail) ─────────────────
// Keys are snake_case to match what we return from Plaid SDK mappers in
// `packages/server-data/src/plaid/actions.ts`. Column types reuse `institutionRowSchema.shape`
// where they match our table; `id` is Plaid `institution_id` (not our DB uuid).

export const institutionSearchResultSchema = z.object({
  id: z.string(),
  logo: institutionRowSchema.shape.logo,
  name: institutionRowSchema.shape.name,
  primary_color: institutionRowSchema.shape.primaryColor,
  url: institutionRowSchema.shape.url,
});

export const institutionSearchResponseSchema = z.object({
  institutions: z.array(institutionSearchResultSchema),
});

/** Full institution from Plaid `institutionsGetById` (mapped). `status` may be non-string on Plaid. */
export const institutionDetailSchema = z.object({
  id: z.string(),
  logo: institutionRowSchema.shape.logo,
  name: institutionRowSchema.shape.name,
  oauth: institutionRowSchema.shape.oauth,
  primary_color: institutionRowSchema.shape.primaryColor,
  routing_numbers: z.array(z.string()),
  status: z.unknown().nullable(),
  url: institutionRowSchema.shape.url,
});

/** Local `institution` row returned by GET `/db/{id}` and sync. */
export const institutionDbSchema = institutionRowSchema.pick({
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
});

export const institutionSyncResponseSchema = z.object({
  institution: institutionDbSchema,
  message: z.string(),
});

export const errorResponseSchema = z.object({
  details: z.string().optional(),
  error: z.string(),
});
