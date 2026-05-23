import { PGlite } from "@electric-sql/pglite";
import { describe, expect, test } from "vitest";

/**
 * Spike test proving pglite catches the partial-unique-index ON CONFLICT bug
 * we hit in production. Self-contained — does not import from db package, so
 * it runs without any env config or migration runner. A full integration test
 * that exercises mutations.ts directly comes next; this validates the toolchain.
 */
describe("pglite — partial unique index ON CONFLICT semantics", () => {
  test("ON CONFLICT without WHERE predicate fails to match a partial index", async () => {
    const pg = new PGlite();
    await pg.exec(`
      CREATE TABLE t (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        import_hash text,
        amount numeric NOT NULL
      );
      CREATE UNIQUE INDEX t_user_hash_idx
        ON t (user_id, import_hash) WHERE import_hash IS NOT NULL;
    `);

    await pg.query(`INSERT INTO t (user_id, import_hash, amount) VALUES ($1, $2, $3)`, [
      "user-a",
      "hash-1",
      10,
    ]);

    // Reproduces the bug: partial index requires the WHERE predicate on conflict.
    await expect(
      pg.query(
        `INSERT INTO t (user_id, import_hash, amount) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, import_hash) DO NOTHING`,
        ["user-a", "hash-1", 10],
      ),
    ).rejects.toThrow(/no unique or exclusion constraint/);
  });

  test("ON CONFLICT WITH the partial WHERE predicate matches and is silent", async () => {
    const pg = new PGlite();
    await pg.exec(`
      CREATE TABLE t (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        import_hash text,
        amount numeric NOT NULL
      );
      CREATE UNIQUE INDEX t_user_hash_idx
        ON t (user_id, import_hash) WHERE import_hash IS NOT NULL;
    `);

    await pg.query(`INSERT INTO t (user_id, import_hash, amount) VALUES ($1, $2, $3)`, [
      "user-a",
      "hash-1",
      10,
    ]);

    const dup = await pg.query<{ id: string }>(
      `INSERT INTO t (user_id, import_hash, amount) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, import_hash) WHERE import_hash IS NOT NULL DO NOTHING
       RETURNING id`,
      ["user-a", "hash-1", 10],
    );

    expect(dup.rows).toHaveLength(0);

    const total = await pg.query<{ count: string }>(`SELECT count(*)::text as count FROM t`);
    expect(total.rows[0]?.count).toBe("1");
  });
});
