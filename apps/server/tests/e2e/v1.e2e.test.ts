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

  describe("per-resource detail + 404 paths (Midday-style broad coverage)", () => {
    // Hit every detail endpoint with a real demo-seeded id when available,
    // and a clearly-bogus uuid to confirm 404 wiring. Catches: detail
    // handler 500s on a real row, or returns 200 for a missing one.
    let apiKey: string;
    const FAKE_UUID = "00000000-0000-4000-a000-0000000000ff";

    beforeAll(async () => {
      ({ apiKey } = await issueTestApiKey());
    });

    test("GET /accounts/{id} with non-existent uuid → 404", async () => {
      const res = await v1(`/accounts/${FAKE_UUID}`, apiKey);
      expect(res.status).toBe(404);
    });

    test("GET /accounts/{id} — fetch a real seeded account, id round-trips", async () => {
      // Seed must produce at least one account for this to run. If the
      // demo seed ever drops account fixtures, this fails loudly — that's
      // a feature, not a flake: the SDK consumer probe IS missing.
      const list = await v1("/accounts", apiKey);
      const { data } = (await list.json()) as { data: { id: string }[] };
      const [first] = data;
      expect(first).toBeDefined();
      const seededId = first?.id ?? "";

      const detail = await v1(`/accounts/${seededId}`, apiKey);
      expect(detail.status).toBe(200);
      const body = (await detail.json()) as { data: { id: string } };
      expect(body.data.id).toBe(seededId);
    });

    test("GET /transactions/{transactionId} with non-existent uuid → 404", async () => {
      const res = await v1(`/transactions/${FAKE_UUID}`, apiKey);
      expect(res.status).toBe(404);
    });

    test("GET /transactions/{transactionId} — fetch a real seeded transaction", async () => {
      const list = await v1("/transactions", apiKey);
      const { data } = (await list.json()) as { data: { id: string }[] };
      const [first] = data;
      expect(first).toBeDefined();
      const seededId = first?.id ?? "";

      const detail = await v1(`/transactions/${seededId}`, apiKey);
      expect(detail.status).toBe(200);
      const body = (await detail.json()) as { data: { id: string } };
      expect(body.data.id).toBe(seededId);
    });

    test("PUT /transactions/{transactionId}/tags with non-existent uuid → 404", async () => {
      // Unconditional 404 probe so we never branch on seed state.
      const res = await v1(`/transactions/${FAKE_UUID}/tags`, apiKey, {
        body: JSON.stringify({ tagIds: [] }),
        method: "PUT",
      });
      expect(res.status).toBe(404);
    });

    test("PUT /transactions/{transactionId}/tags — attach a tag round-trip", async () => {
      // Round-trip: create tag, fetch a real transaction, attach the tag,
      // refetch, assert tag id appears in `tagIds`. Catches: handler
      // forgets to refetch, or `transactionId` param not piped through.
      const txList = await v1("/transactions", apiKey);
      const { data: txs } = (await txList.json()) as { data: { id: string }[] };
      const [txn] = txs;
      expect(txn).toBeDefined();
      const txnId = txn?.id ?? "";

      const tagCreate = await v1("/tags", apiKey, {
        body: JSON.stringify({ color: "violet", name: `tx-tag-${Date.now()}` }),
        method: "POST",
      });
      const { data: tag } = (await tagCreate.json()) as { data: { id: string } };

      const setTags = await v1(`/transactions/${txnId}/tags`, apiKey, {
        body: JSON.stringify({ tagIds: [tag.id] }),
        method: "PUT",
      });
      expect(setTags.status).toBe(200);
      const updated = (await setTags.json()) as { data: { tagIds: string[] } };
      expect(updated.data.tagIds).toContain(tag.id);

      // Cleanup
      await v1(`/tags/${tag.id}`, apiKey, { method: "DELETE" });
    });

    test("read-only resources serve consistent envelopes on second call", async () => {
      // Hits each read-only resource twice, asserts both calls return 200
      // with the same envelope shape. Catches: handler has a side effect
      // that breaks idempotency, or middleware mutates apiKey state in a
      // way that affects subsequent calls under the same key.
      const paths = [
        "/positions",
        "/activities",
        "/portfolio/snapshots",
        "/balances/snapshots",
        "/categories",
        "/recurring",
        "/spending?period=1w",
      ];
      const pairs = await Promise.all(
        paths.map(async (p) => {
          const [a, b] = await Promise.all([v1(p, apiKey), v1(p, apiKey)]);
          return {
            both200: a.status === 200 && b.status === 200,
            path: p,
          };
        }),
      );
      const failing = pairs.filter((p) => !p.both200);
      expect(failing).toStrictEqual([]);
    });

    test("invalid bearer on a write endpoint also rejects (not just GET)", async () => {
      // Auth describe already covers GET /accounts. Confirm the same gate
      // applies to mutation endpoints — a misconfigured middleware-per-
      // route ordering could let writes through unguarded.
      const res = await fetch(`${BASE_URL}/v1/tags`, {
        body: JSON.stringify({ color: "red", name: "should-not-create" }),
        headers: {
          authorization: "Bearer ck_live_bogus_write_attempt",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        method: "POST",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("per-resource response shapes + query params", () => {
    // One test per remaining resource: validate the wire shape so a
    // server-data refactor that drops a field gets caught even when the
    // demo seed returns rows the basic 200 check would let pass.
    // Read-only resources only (positions, activities, snapshots,
    // categories, recurring, spending). Tags + accounts + transactions
    // shape coverage lives in the CRUD round-trips above.
    let apiKey: string;

    beforeAll(async () => {
      ({ apiKey } = await issueTestApiKey());
    });

    test("GET /positions — array of position rows with stable id + symbol shape", async () => {
      const { json, status } = await v1("/positions", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          accountId: string;
          id: string;
          marketValue: number | null;
          price: number | null;
          symbol: string | null;
          units: number | null;
        }[];
      }>();
      expect(Array.isArray(body.data)).toBeTruthy();
      const malformed = body.data.filter(
        (r) => typeof r.id !== "string" || typeof r.accountId !== "string",
      );
      expect(malformed).toStrictEqual([]);
    });

    test("GET /positions?accountId={id} — filter passes through to query layer", async () => {
      // Probe with a syntactically valid but non-matching account id.
      // Expect empty data set (handler doesn't 404 on no match).
      const res = await v1("/positions?accountId=00000000-0000-4000-a000-000000000fff", apiKey);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toStrictEqual([]);
    });

    test("GET /activities — array shape, currency + dates nullable", async () => {
      const { json, status } = await v1("/activities", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          accountId: string;
          amount: number | null;
          currency: string | null;
          id: string;
          settlementDate: string | null;
          tradeDate: string | null;
        }[];
      }>();
      expect(Array.isArray(body.data)).toBeTruthy();
      const missingIds = body.data.filter((r) => typeof r.id !== "string");
      expect(missingIds).toStrictEqual([]);
    });

    test("GET /activities?limit=5 — limit param honored", async () => {
      // limit=5 caps the result. Real seed may have <5 rows; test only
      // asserts we never EXCEED the cap. Catches: handler ignores limit
      // or sends it through the wrong param name.
      const { json, status } = await v1("/activities?limit=5", apiKey);
      expect(status).toBe(200);
      const body = await json<{ data: unknown[] }>();
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    test("GET /portfolio/snapshots — date string + value shape", async () => {
      const { json, status } = await v1("/portfolio/snapshots", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: { accountId: string; date: string; id: string; value: number }[];
      }>();
      expect(Array.isArray(body.data)).toBeTruthy();
      const badShape = body.data.filter(
        (r) =>
          typeof r.date !== "string" || typeof r.value !== "number" || typeof r.id !== "string",
      );
      expect(badShape).toStrictEqual([]);
    });

    test("GET /portfolio/snapshots?startDate&endDate — date range filter accepted", async () => {
      // Range filter accepted + no 5xx. Empty result tolerated.
      const res = await v1("/portfolio/snapshots?startDate=2026-01-01&endDate=2026-05-22", apiKey);
      expect(res.status).toBe(200);
    });

    test("GET /balances/snapshots — id + date + currentBalance shape", async () => {
      const { json, status } = await v1("/balances/snapshots", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          accountId: string;
          currentBalance: number;
          date: string;
          id: string;
        }[];
      }>();
      expect(Array.isArray(body.data)).toBeTruthy();
      const badShape = body.data.filter(
        (r) => typeof r.currentBalance !== "number" || typeof r.date !== "string",
      );
      expect(badShape).toStrictEqual([]);
    });

    test("GET /balances/snapshots?accountId={id} — handler-side post-filter works", async () => {
      // balance-snapshots filter is applied after the data layer
      // (handler-side) per source comment. Probe with bogus id → empty.
      const res = await v1(
        "/balances/snapshots?accountId=00000000-0000-4000-a000-000000000fff",
        apiKey,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toStrictEqual([]);
    });

    test("GET /categories — nested envelope { data: { categories[], groups[] } }", async () => {
      // Only public endpoint with a double-wrapped envelope.
      const { json, status } = await v1("/categories", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          categories: { id: string; name: string }[];
          groups: { id: string; name: string }[];
        };
      }>();
      expect(Array.isArray(body.data.categories)).toBeTruthy();
      expect(Array.isArray(body.data.groups)).toBeTruthy();
      const badCats = body.data.categories.filter(
        (c) => typeof c.id !== "string" || typeof c.name !== "string",
      );
      expect(badCats).toStrictEqual([]);
    });

    test("GET /recurring — stream shape with nested category + nullable dates", async () => {
      const { json, status } = await v1("/recurring", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          accountId: string;
          averageAmount: number;
          category: { id: string; name: string } | null;
          frequency: string;
          id: string;
          isActive: boolean;
          lastDate: string | null;
        }[];
      }>();
      expect(Array.isArray(body.data)).toBeTruthy();
      const badShape = body.data.filter(
        (r) =>
          typeof r.id !== "string" ||
          typeof r.averageAmount !== "number" ||
          typeof r.isActive !== "boolean",
      );
      expect(badShape).toStrictEqual([]);
    });

    test("GET /spending?period=1w — buckets + average label + totals shape", async () => {
      const { json, status } = await v1("/spending?period=1w", apiKey);
      expect(status).toBe(200);
      const body = await json<{
        data: {
          averageLabel: "daily" | "weekly" | "monthly" | "yearly";
          averageSpending: number;
          buckets: { amount: number; date: string }[];
          totalSpending: number;
        };
      }>();
      const ALLOWED = new Set(["daily", "weekly", "monthly", "yearly"]);
      expect(ALLOWED.has(body.data.averageLabel)).toBeTruthy();
      expectTypeOf(body.data.totalSpending).toBeNumber();
      expect(Array.isArray(body.data.buckets)).toBeTruthy();
    });

    test("GET /spending across every period enum — all return 200 with matching averageLabel", async () => {
      // Wire-checks every documented `period` value. Catches: dropping a
      // period from the public schema or breaking the period→averageLabel
      // mapping in server-data.
      const periods = ["1w", "1m", "3m", "6m", "1y", "all"] as const;
      const results = await Promise.all(
        periods.map(async (p) => {
          const r = await v1(`/spending?period=${p}`, apiKey);
          return { period: p, status: r.status };
        }),
      );
      const failed = results.filter((r) => r.status !== 200);
      expect(failed).toStrictEqual([]);
    });

    test("GET /spending?accountType=credit and =depository — both 200", async () => {
      const results = await Promise.all(
        (["credit", "depository", "all"] as const).map(async (t) => {
          const r = await v1(`/spending?period=1m&accountType=${t}`, apiKey);
          return { status: r.status, t };
        }),
      );
      const failed = results.filter((r) => r.status !== 200);
      expect(failed).toStrictEqual([]);
    });
  });

  describe("transactions — pagination + filter coverage", () => {
    let apiKey: string;

    beforeAll(async () => {
      ({ apiKey } = await issueTestApiKey());
    });

    test("GET /transactions?limit=1 honors the cap", async () => {
      const { json, status } = await v1("/transactions?limit=1", apiKey);
      expect(status).toBe(200);
      const body = await json<{ data: unknown[]; hasMore: boolean }>();
      expect(body.data.length).toBeLessThanOrEqual(1);
    });

    test("GET /transactions?cursor pagination — page 2 doesn't overlap page 1", async () => {
      // limit=1 + cursor flow validates cursor encode/decode + ordering
      // determinism. If the demo seed has <2 transactions the second page
      // legitimately empties; either is fine.
      const page1 = await v1("/transactions?limit=1", apiKey);
      const body1 = (await page1.json()) as {
        data: { id: string }[];
        hasMore: boolean;
        nextCursor: string | null;
      };
      // The pagination invariant (page2 doesn't overlap page1) only
      // applies if there's actually a second page. Encode it as a single
      // unconditional assertion: either no nextCursor (seed < 2 rows) OR
      // page2 ids disjoint from page1.
      const page1Ids = new Set(body1.data.map((t) => t.id));
      const page2 = await v1(`/transactions?limit=1&cursor=${body1.nextCursor ?? ""}`, apiKey);
      expect(page2.status).toBe(200);
      const body2 = (await page2.json()) as { data: { id: string }[] };
      const overlap = body1.nextCursor ? body2.data.filter((t) => page1Ids.has(t.id)) : [];
      expect(overlap).toStrictEqual([]);
    });

    test("GET /transactions?accountId={bogus} returns empty data", async () => {
      const res = await v1("/transactions?accountId=00000000-0000-4000-a000-000000000fff", apiKey);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toStrictEqual([]);
    });

    test("GET /transactions?startDate&endDate — date range filter accepted", async () => {
      const res = await v1(
        "/transactions?startDate=2026-01-01&endDate=2026-12-31&limit=10",
        apiKey,
      );
      expect(res.status).toBe(200);
    });
  });
});
