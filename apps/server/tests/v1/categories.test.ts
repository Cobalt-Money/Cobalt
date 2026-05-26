/**
 * `/v1/categories` — focused on the nested `{ data: { categories, groups } }`
 * envelope (the only public endpoint with a double-wrapped data shape).
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

import { request, TEST_USER_ID } from "./_helpers/test-app";

vi.mock(import("../../src/api/public/v1/middleware/require-api-key.js"), () => ({
  requireApiKey: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("user", { id: TEST_USER_ID });
    c.set("zeroContext", { userId: TEST_USER_ID });
    await next();
  },
}));

const getCategories = vi.fn();

vi.mock(import("@cobalt-web/server-data/categories/list"), () => ({
  getCategories: (...args: unknown[]) => getCategories(...args),
}));

const { categoriesRouter } = await import("../../src/api/public/v1/categories.js");

describe("v1/categories", () => {
  beforeEach(() => {
    getCategories.mockReset();
  });

  describe("GET /categories", () => {
    test("returns nested envelope { data: { categories, groups } }", async () => {
      getCategories.mockResolvedValue({
        categories: [
          {
            excludeFromInsights: false,
            groupId: "grp_1",
            hidden: false,
            iconKey: "shopping",
            id: "cat_1",
            name: "Groceries",
            systemKey: "groceries",
          },
        ],
        groups: [{ id: "grp_1", name: "Food", systemKey: "food" }],
      });

      const { json, status } = await request(categoriesRouter, "/categories");
      const body = await json<{ categories: { id: string }[]; groups: { id: string }[] }>();

      expect(status).toBe(200);
      expect(body.categories).toHaveLength(1);
      expect(body.groups).toHaveLength(1);
    });

    test("returns 500 when category row is missing required fields", async () => {
      getCategories.mockResolvedValue({
        categories: [{ id: "cat_1" /* missing name */ }],
        groups: [],
      });

      const { status } = await request(categoriesRouter, "/categories");

      expect(status).toBe(500);
    });
  });
});
