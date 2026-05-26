/**
 * `/v1/tags` — covers list + create + detail (get/patch/delete). Focused on:
 *   - Body validation (422 from createApp's defaultHook)
 *   - 404 paths on missing tag (handler returns explicit `{code, error}`)
 *   - Wiring of `tagId` path param through to mutation/query calls
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

const listTags = vi.fn();
const getTag = vi.fn();
const createTag = vi.fn();
const updateTag = vi.fn();
const deleteTag = vi.fn();

vi.mock(import("@cobalt-web/server-data/transactions/tags/queries"), () => ({
  getTag: (...args: unknown[]) => getTag(...args),
  listTags: (...args: unknown[]) => listTags(...args),
}));

vi.mock(import("@cobalt-web/server-data/transactions/tags/mutations"), () => ({
  createTag: (...args: unknown[]) => createTag(...args),
  deleteTag: (...args: unknown[]) => deleteTag(...args),
  updateTag: (...args: unknown[]) => updateTag(...args),
}));

const { tagsRouter } = await import("../../src/api/public/v1/tags/index.js");

const validTag = {
  archivedAt: null,
  color: "red",
  createdAt: "2026-05-22T00:00:00Z",
  id: "00000000-0000-4000-a000-000000000001",
  name: "important",
};

describe("v1/tags", () => {
  beforeEach(() => {
    listTags.mockReset();
    getTag.mockReset();
    createTag.mockReset();
    updateTag.mockReset();
    deleteTag.mockReset();
  });

  describe("POST /tags", () => {
    test("rejects body missing required field with 422", async () => {
      // `createTagSchema` requires `name`. Empty body → defaultHook fires 422
      // before handler runs (createTag mock must NOT be called).
      const { status } = await request(tagsRouter, "/tags", {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(status).toBe(422);
      expect(createTag).not.toHaveBeenCalled();
    });

    test("creates tag then refetches and returns it", async () => {
      createTag.mockResolvedValue({ id: "00000000-0000-4000-a000-000000000003" });
      getTag.mockResolvedValue({
        ...validTag,
        id: "00000000-0000-4000-a000-000000000003",
        name: "urgent",
      });

      const { json, status } = await request(tagsRouter, "/tags", {
        body: JSON.stringify({ color: "green", name: "urgent" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await json<{ id: string; name: string }>();

      expect(status).toBe(201);
      expect(body.name).toBe("urgent");
      expect(getTag).toHaveBeenCalledWith(TEST_USER_ID, "00000000-0000-4000-a000-000000000003");
    });

    test("throws when refetch returns null (just-created row vanished)", async () => {
      // Programming-error guard, NOT a 404 path. createTag returned an id
      // that getTag can't find — invariant violation. Handler throws bare
      // Error → 500 via global onError.
      createTag.mockResolvedValue({ id: "00000000-0000-4000-a000-000000000006" });
      getTag.mockResolvedValue(null);

      const { status } = await request(tagsRouter, "/tags", {
        body: JSON.stringify({ color: "amber", name: "ghost" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(status).toBe(500);
    });
  });

  describe("GET /tags/{tagId}", () => {
    test("returns typed 404 when getTag returns null", async () => {
      getTag.mockResolvedValue(null);

      const { json, status } = await request(
        tagsRouter,
        "/tags/00000000-0000-4000-a000-000000000004",
      );
      const body = await json<{ code: string; error: string }>();

      expect(status).toBe(404);
      expect(body).toStrictEqual({ code: "tag_not_found", error: "Tag not found" });
    });

    test("path tagId reaches the query alongside userId", async () => {
      getTag.mockResolvedValue(validTag);

      await request(tagsRouter, "/tags/00000000-0000-4000-a000-000000000002");

      expect(getTag).toHaveBeenCalledWith(TEST_USER_ID, "00000000-0000-4000-a000-000000000002");
    });
  });

  describe("PATCH /tags/{tagId}", () => {
    test("calls updateTag then refetches and returns updated row", async () => {
      updateTag.mockResolvedValue(undefined as never);
      getTag.mockResolvedValue({ ...validTag, name: "renamed" });

      const { json, status } = await request(
        tagsRouter,
        "/tags/00000000-0000-4000-a000-000000000001",
        {
          body: JSON.stringify({ name: "renamed" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      );
      const body = await json<{ name: string }>();

      expect(status).toBe(200);
      expect(updateTag).toHaveBeenCalledWith(TEST_USER_ID, "00000000-0000-4000-a000-000000000001", {
        name: "renamed",
      });
      expect(body.name).toBe("renamed");
    });

    test("returns 404 when post-update refetch returns null", async () => {
      // Race: tag deleted between update + refetch. Handler must surface
      // 404 (not the just-applied update silently succeeding).
      updateTag.mockResolvedValue(undefined as never);
      getTag.mockResolvedValue(null);

      const { status } = await request(tagsRouter, "/tags/00000000-0000-4000-a000-000000000005", {
        body: JSON.stringify({ name: "x" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });

      expect(status).toBe(404);
    });
  });

  describe("DELETE /tags/{tagId}", () => {
    test("returns 204 with no body and calls deleteTag with userId + id", async () => {
      deleteTag.mockResolvedValue(undefined as never);

      const { res, status } = await request(
        tagsRouter,
        "/tags/00000000-0000-4000-a000-000000000001",
        { method: "DELETE" },
      );

      expect(status).toBe(204);
      await expect(res.text()).resolves.toBe("");
      expect(deleteTag).toHaveBeenCalledWith(TEST_USER_ID, "00000000-0000-4000-a000-000000000001");
    });
  });
});
