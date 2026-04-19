import { z } from "@hono/zod-openapi";

export const exchangeTokenBodySchema = z.object({
  public_token: z.string(),
});

export const persistItemBodySchema = z.object({
  access_token: z.string(),
  item_id: z.string(),
});

export const plaidItemIdBodySchema = z.object({
  plaidItemId: z.string(),
});

export const updateLinkTokenBodySchema = z.object({
  mode: z.enum(["add-accounts", "add-products", "reauth"]),
  plaidItemId: z.string(),
});

export const linkTokenResponseSchema = z.object({
  link_token: z.string(),
});

export const exchangeTokenResponseSchema = z.object({
  access_token: z.string(),
  item_id: z.string(),
});

export const successResponseSchema = z.object({
  success: z.boolean(),
});

export const errorResponseSchema = z.object({
  code: z.string().optional(),
  error: z.string(),
});
