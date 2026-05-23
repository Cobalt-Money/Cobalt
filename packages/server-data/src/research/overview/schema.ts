import { z } from "@hono/zod-openapi";

export { symbolQuerySchema } from "../_shared/schema.js";

/** Normalized company profile returned by `getProfile`. */
export const fmpProfileSchema = z.object({
  beta: z.number().nullable(),
  ceo: z.string().nullable(),
  companyName: z.string(),
  country: z.string().nullable(),
  currency: z.string().nullable(),
  description: z.string().nullable(),
  dividendYield: z.number().nullable(),
  exchange: z.string().nullable(),
  fullTimeEmployees: z.number().nullable(),
  industry: z.string().nullable(),
  ipoDate: z.string().nullable(),
  marketCap: z.number().nullable(),
  pe: z.number().nullable(),
  price: z.number().nullable(),
  revenue: z.number().nullable(),
  sector: z.string().nullable(),
  symbol: z.string(),
  website: z.string().nullable(),
});

export type FmpProfile = z.infer<typeof fmpProfileSchema>;

export const overviewResponseSchema = fmpProfileSchema.openapi("Overview", {
  description:
    "Normalized FMP company profile (stable `/profile` + optional P/E and revenue enrichment).",
});

export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
