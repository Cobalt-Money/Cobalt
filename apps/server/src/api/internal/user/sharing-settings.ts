import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  addCategoryToBlocklist,
  addMerchantToBlocklist,
  blocklistEntrySchema,
  getShareSettings,
  removeCategoryFromBlocklist,
  removeMerchantFromBlocklist,
  shareSettingsRequestSchema,
  shareSettingsResponseSchema,
  upsertShareSettings,
} from "@cobalt-web/server-data/social";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, jsonContentRequired } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const getRoute = createRoute({
  description: "Get the authenticated user's auto-share field preferences.",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/sharingSettings",
  responses: {
    200: jsonContent(shareSettingsResponseSchema, "Share settings"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Get sharing settings",
  tags: ["User"],
});

const postRoute = createRoute({
  description:
    "Update the authenticated user's auto-share field preferences. Partial — only sent fields are written.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sharingSettings",
  request: { body: jsonContentRequired(shareSettingsRequestSchema, "Settings patch") },
  responses: {
    200: jsonContent(shareSettingsResponseSchema, "Updated settings"),
    400: jsonContent(errorResponseWithCodeSchema, "Validation error"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Update sharing settings",
  tags: ["User"],
});

const okSchema = z.object({ ok: z.boolean() });

const addMerchantRoute = createRoute({
  description:
    "Add a merchant to the share blocklist. Retroactively deletes matching shared posts.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sharingSettings/merchantBlocklist",
  request: { body: jsonContentRequired(blocklistEntrySchema, "Merchant name") },
  responses: {
    200: jsonContent(okSchema, "Added"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Block a merchant from sharing",
  tags: ["User"],
});

const removeMerchantRoute = createRoute({
  description: "Remove a merchant from the share blocklist. Future syncs will share again.",
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/sharingSettings/merchantBlocklist",
  request: { body: jsonContentRequired(blocklistEntrySchema, "Merchant name") },
  responses: {
    200: jsonContent(okSchema, "Removed"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Unblock a merchant",
  tags: ["User"],
});

const addCategoryRoute = createRoute({
  description:
    "Add a category to the share blocklist. Retroactively deletes matching shared posts.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/sharingSettings/categoryBlocklist",
  request: { body: jsonContentRequired(blocklistEntrySchema, "Category name") },
  responses: {
    200: jsonContent(okSchema, "Added"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Block a category from sharing",
  tags: ["User"],
});

const removeCategoryRoute = createRoute({
  description: "Remove a category from the share blocklist. Future syncs will share again.",
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/sharingSettings/categoryBlocklist",
  request: { body: jsonContentRequired(blocklistEntrySchema, "Category name") },
  responses: {
    200: jsonContent(okSchema, "Removed"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Unblock a category",
  tags: ["User"],
});

export const sharingSettingsRouter = createApp()
  .openapi(getRoute, async (c) => {
    const result = await getShareSettings(c.var.user.id);
    return c.json(shareSettingsResponseSchema.parse(result), 200);
  })
  .openapi(postRoute, async (c) => {
    const body = c.req.valid("json");
    const existing = await getShareSettings(c.var.user.id);
    try {
      const merged = await upsertShareSettings(c.var.user.id, { ...existing, ...body });
      return c.json(shareSettingsResponseSchema.parse(merged), 200);
    } catch (error) {
      return c.json(
        { code: "VALIDATION_ERROR", error: error instanceof Error ? error.message : "Invalid" },
        400,
      );
    }
  })
  .openapi(addMerchantRoute, async (c) => {
    await addMerchantToBlocklist(c.var.user.id, c.req.valid("json").name);
    return c.json({ ok: true }, 200);
  })
  .openapi(removeMerchantRoute, async (c) => {
    await removeMerchantFromBlocklist(c.var.user.id, c.req.valid("json").name);
    return c.json({ ok: true }, 200);
  })
  .openapi(addCategoryRoute, async (c) => {
    await addCategoryToBlocklist(c.var.user.id, c.req.valid("json").name);
    return c.json({ ok: true }, 200);
  })
  .openapi(removeCategoryRoute, async (c) => {
    await removeCategoryFromBlocklist(c.var.user.id, c.req.valid("json").name);
    return c.json({ ok: true }, 200);
  });
