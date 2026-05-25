import { z } from "@hono/zod-openapi";

import { locationJsonSchema } from "../transactions/_shared/schema.js";

/** Single Nominatim search result, normalised to our `LocationJson` plus `display_name`. */
export const geocodeSearchResultSchema = z.object({
  displayName: z.string(),
  location: locationJsonSchema,
});

export const geocodeSearchResponseSchema = z.object({
  results: z.array(geocodeSearchResultSchema),
});

export const geocodeSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
});
