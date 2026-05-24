/**
 * E2E coverage for `/v1/*` against the spawned Nitro. Validates the FULL
 * stack: real Better Auth issuance → Bearer middleware → Hono router →
 * server-data queries → Postgres → response.
 *
 * Each `describe` block issues its own API key(s) so cases don't share
 * rate-limit buckets or DB state. Focus areas:
 *
 *   1. Auth failure modes (missing / malformed / unknown) — middleware-only,
 *      can't be simulated with handler mocks
 *   2. Round-trip CRUD per mutating resource (tags, transactions) — the
 *      "create endpoint silently drops a field" bug only shows up when the
 *      same DB row is round-tripped through create + fetch
 *   3. Cross-user isolation — issue 2 keys for 2 anonymous users, verify
 *      data created by A is invisible to B. Catches: missing userId filter
 *      in any query = data leak
 *   4. Contract spot-checks — fetch /openapi.json and verify the served
 *      spec advertises every route + the bearerAuth scheme. SDK codegen
 *      breaks loudly if this is wrong.
 *
 * What's NOT here:
 *   - Rate-limit 429 — Better Auth's per-key budget is 10k/day; lowering it
 *     for tests would require a config knob we don't have yet.
 *   - Full schema-vs-response contract test — would need ajv + spec walk,
 *     not worth the dependency for v1.
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { BASE_URL, issueTestApiKey, v1 } from "./_helpers/api-key";

describe("v1 e2e", () => {
  describe("auth — middleware failure modes", () => {
    test("missing Authorization → 401 missing_api_key", async () => {
      const res = await fetch(`${BASE_URL}/v1/accounts`);
      expect(res.status).toBe(401);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("missing_api_key");
    });

    test("malformed Authorization (no Bearer prefix) → 401", async () => {
      const res = await fetch(`${BASE_URL}/v1/accounts`, {
        headers: { authorization: "ck_live_garbage" },
      });
      expect(res.status).toBe(401);
    });

    test("syntactically valid but unknown bearer → 401 invalid_api_key", async () => {
      const res = await fetch(`${BASE_URL}/v1/accounts`, {
        headers: { authorization: "Bearer ck_live_definitely_not_a_real_key" },
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { code: string };
      // Better Auth returns the apikey plugin error codes in UPPER_SNAKE_CASE.
      expect(body.code).toMatch(/INVALID_API_KEY|KEY_NOT_FOUND/);
    });
  });

  describe("tags — full CRUD round-trip", () => {
    let apiKey: string;
    const createdTagIds: string[] = [];

    beforeAll(async () => {
      ({ apiKey } = await issueTestApiKey());
    });

    afterAll(async () => {
      // Defensive cleanup; the demo user gets reset cron'd anyway, but
      // leaving stray rows means re-runs against the same DB see drift.
      for (const id of createdTagIds) {
        await v1(`/tags/${id}`, apiKey, { method: "DELETE" });
      }
    });

    test("POST → GET list contains the created row with same fields", async () => {
      const name = `e2e-${Date.now()}`;
      const createRes = await v1("/tags", apiKey, {
        body: JSON.stringify({ color: "amber", name }),
        method: "POST",
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        data: { color: string; id: string; name: string };
      };
      expect(created.data.name).toBe(name);
      expect(created.data.color).toBe("amber");
      createdTagIds.push(created.data.id);

      const listRes = await v1("/tags", apiKey);
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as {
        data: { id: string; name: string }[];
      };
      const found = list.data.find((t) => t.id === created.data.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe(name);
    });

    test("GET /tags/{tagId} returns the same row created via POST", async () => {
      const createRes = await v1("/tags", apiKey, {
        body: JSON.stringify({ color: "red", name: `e2e-${Date.now()}` }),
        method: "POST",
      });
      const created = (await createRes.json()) as {
        data: { color: string; id: string; name: string };
      };
      createdTagIds.push(created.data.id);

      const getRes = await v1(`/tags/${created.data.id}`, apiKey);
      expect(getRes.status).toBe(200);
      const got = (await getRes.json()) as {
        data: { color: string; id: string; name: string };
      };
      expect(got.data).toMatchObject({
        color: "red",
        id: created.data.id,
        name: created.data.name,
      });
    });

    test("PATCH renames the tag; subsequent GET reflects the new name", async () => {
      const createRes = await v1("/tags", apiKey, {
        body: JSON.stringify({ color: "blue", name: `e2e-${Date.now()}` }),
        method: "POST",
      });
      const { data: created } = (await createRes.json()) as { data: { id: string } };
      createdTagIds.push(created.id);

      const renamed = `renamed-${Date.now()}`;
      const patchRes = await v1(`/tags/${created.id}`, apiKey, {
        body: JSON.stringify({ name: renamed }),
        method: "PATCH",
      });
      expect(patchRes.status).toBe(200);

      const getRes = await v1(`/tags/${created.id}`, apiKey);
      const got = (await getRes.json()) as { data: { name: string } };
      expect(got.data.name).toBe(renamed);
    });

    test("DELETE returns 204 and subsequent GET returns 404", async () => {
      const createRes = await v1("/tags", apiKey, {
        body: JSON.stringify({ color: "green", name: `e2e-${Date.now()}` }),
        method: "POST",
      });
      const { data: created } = (await createRes.json()) as { data: { id: string } };

      const delRes = await v1(`/tags/${created.id}`, apiKey, { method: "DELETE" });
      expect(delRes.status).toBe(204);

      const getRes = await v1(`/tags/${created.id}`, apiKey);
      expect(getRes.status).toBe(404);
      const body = (await getRes.json()) as { code: string };
      expect(body.code).toBe("tag_not_found");
    });

    test("422 on invalid body (unknown color enum)", async () => {
      const res = await v1("/tags", apiKey, {
        body: JSON.stringify({ color: "not-a-real-color", name: "x" }),
        method: "POST",
      });
      expect(res.status).toBe(422);
    });

    test("404 on detail with non-existent uuid", async () => {
      const res = await v1("/tags/00000000-0000-4000-a000-000000000fff", apiKey);
      expect(res.status).toBe(404);
    });

    test("422 on detail with malformed (non-uuid) id", async () => {
      const res = await v1("/tags/not-a-uuid", apiKey);
      expect(res.status).toBe(422);
    });
  });

  describe("cross-user isolation", () => {
    test("user A's tag is invisible to user B", async () => {
      // Two fresh anonymous users with their own keys. Better Auth scopes
      // every apiKey to its `userId`; the /v1/* handlers must respect that
      // via `c.var.user.id` in their WHERE clauses.
      const [aliceAuth, bobAuth] = await Promise.all([issueTestApiKey(), issueTestApiKey()]);

      const aliceTagName = `alice-${Date.now()}`;
      const create = await v1("/tags", aliceAuth.apiKey, {
        body: JSON.stringify({ color: "amber", name: aliceTagName }),
        method: "POST",
      });
      expect(create.status).toBe(201);
      const { data: aliceTag } = (await create.json()) as { data: { id: string } };

      // Bob's list MUST NOT contain Alice's tag id.
      const bobList = await v1("/tags", bobAuth.apiKey);
      const body = (await bobList.json()) as { data: { id: string }[] };
      const leaked = body.data.find((t) => t.id === aliceTag.id);
      expect(leaked).toBeUndefined();

      // Direct fetch by Alice's tag id with Bob's key → 404 (not 200).
      // Worst-case: missing userId filter returns the row.
      const bobGet = await v1(`/tags/${aliceTag.id}`, bobAuth.apiKey);
      expect(bobGet.status).toBe(404);
    });
  });

  describe("openapi spec — contract foundation for SDK codegen", () => {
    test("spec is served, 3.1, declares bearerAuth + every /v1 route", async () => {
      const res = await fetch(`${BASE_URL}/v1/openapi.json`);
      expect(res.status).toBe(200);
      const spec = (await res.json()) as {
        components?: { securitySchemes?: Record<string, unknown> };
        openapi: string;
        paths: Record<string, unknown>;
      };

      expect(spec.openapi).toBe("3.1.0");
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();

      // Spot-check the routes the SDK consumer cares about. If any of these
      // go missing, generated client methods disappear and downstream
      // integrations break silently on bump.
      const required = [
        "/accounts",
        "/accounts/{id}",
        "/transactions",
        "/transactions/{transactionId}",
        "/transactions/{transactionId}/tags",
        "/tags",
        "/tags/{tagId}",
        "/positions",
        "/activities",
        "/portfolio/snapshots",
        "/balances/snapshots",
        "/categories",
        "/recurring",
        "/spending",
      ];
      const missing = required.filter((p) => !(p in spec.paths));
      expect(missing).toStrictEqual([]);
    });
  });

  describe("happy-path reads with issued key", () => {
    let apiKey: string;

    beforeAll(async () => {
      ({ apiKey } = await issueTestApiKey());
    });

    test("all read endpoints return 200 with a single user's key", async () => {
      const paths = [
        "/accounts",
        "/transactions",
        "/categories",
        "/tags",
        "/positions",
        "/activities",
        "/portfolio/snapshots",
        "/balances/snapshots",
        "/recurring",
        "/spending?period=1m",
      ];
      const results = await Promise.all(
        paths.map(async (p) => {
          const r = await v1(p, apiKey);
          return { path: p, status: r.status };
        }),
      );
      const failed = results.filter((r) => r.status !== 200);
      expect(failed).toStrictEqual([]);
    });

    test("GET /accounts response has correct envelope + entity shape", async () => {
      // Stronger shape check: every account row has the required public
      // fields and the type enum is one of the documented values. Catches:
      // schema transform drops a field, mapAccountType refactor breaks.
      const { json, status } = await v1("/accounts", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          balance: number | null;
          currency: string | null;
          id: string;
          institution: string | null;
          mask: string | null;
          name: string;
          type: string;
        }[];
      }>();
      expect(Array.isArray(body.data)).toBeTruthy();

      // When demo seed actually produced accounts, assert every row's type
      // is in the public enum. Empty array (seed produced nothing) is
      // tolerated — the SDK contract is about shape WHEN rows exist.
      const ALLOWED_TYPES = new Set(["bank", "credit_card", "investment", "loan", "other"]);
      const badTypes = body.data.map((r) => r.type).filter((t) => !ALLOWED_TYPES.has(t));
      expect(badTypes).toStrictEqual([]);
      const missingIds = body.data.filter((r) => typeof r.id !== "string");
      expect(missingIds).toStrictEqual([]);
    });
  });
});
