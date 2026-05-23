import { z } from "@hono/zod-openapi";

/**
 * Snapshot DTO. `value` = the snapshot row's `current` column — total account
 * value at end-of-day.
 */
export const portfolioSnapshotItemSchema = z
  .object({
    accountId: z.string(),
    id: z.string(),
    snapshotDate: z.string(),
    value: z.number(),
  })
  .openapi("PortfolioSnapshot");

export const portfolioSnapshotsQuerySchema = z.object({
  accountId: z.string().optional(),
  endDate: z.string().optional(),
  startDate: z.string().optional(),
});

export const portfolioSnapshotsResponseSchema = z.object({
  snapshots: z.array(portfolioSnapshotItemSchema),
});

export type PortfolioSnapshotItem = z.infer<typeof portfolioSnapshotItemSchema>;
export type PortfolioSnapshotsQuery = z.infer<typeof portfolioSnapshotsQuerySchema>;
export type PortfolioSnapshotsResponse = z.infer<typeof portfolioSnapshotsResponseSchema>;
