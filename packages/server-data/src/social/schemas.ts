import { z } from "@hono/zod-openapi";

export const shareSettingsResponseSchema = z
  .object({
    shareAmount: z.boolean(),
    shareCard: z.boolean(),
    shareDate: z.boolean(),
    shareMaxAmountCents: z.number().int().nullable(),
    shareMerchant: z.boolean(),
    shareMinAmountCents: z.number().int().nullable(),
    shareNote: z.boolean(),
  })
  .openapi("ShareSettings");

export const shareSettingsRequestSchema = z
  .object({
    shareAmount: z.boolean().optional(),
    shareCard: z.boolean().optional(),
    shareDate: z.boolean().optional(),
    shareMaxAmountCents: z.number().int().min(0).nullable().optional(),
    shareMerchant: z.boolean().optional(),
    shareMinAmountCents: z.number().int().min(0).nullable().optional(),
    shareNote: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.shareMinAmountCents === null ||
      v.shareMinAmountCents === undefined ||
      v.shareMaxAmountCents === null ||
      v.shareMaxAmountCents === undefined ||
      v.shareMinAmountCents <= v.shareMaxAmountCents,
    { message: "shareMinAmountCents must be <= shareMaxAmountCents" },
  );

export const blocklistEntrySchema = z.object({ name: z.string().min(1).max(200) });
