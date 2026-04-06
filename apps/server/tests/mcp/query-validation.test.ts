import { describe, expect, it } from "vitest";

import { safeReadOnlyQuery } from "../../src/mcp/services/query-executor.js";

describe("safeReadOnlyQuery", () => {
  describe("allows valid read-only queries", () => {
    it("accepts a basic SELECT", () => {
      const result = safeReadOnlyQuery("SELECT * FROM transaction");
      expect(result).toBe("SELECT * FROM transaction LIMIT 500");
    });

    it("accepts a WITH (CTE) query", () => {
      const result = safeReadOnlyQuery(
        "WITH recent AS (SELECT * FROM transaction) SELECT * FROM recent"
      );
      expect(result).toContain("LIMIT 500");
    });

    it("is case-insensitive for SELECT", () => {
      const result = safeReadOnlyQuery("select id from bank_account");
      expect(result).toBe("select id from bank_account LIMIT 500");
    });

    it("accepts queries with leading whitespace", () => {
      const result = safeReadOnlyQuery("  SELECT 1");
      expect(result).toBe("SELECT 1 LIMIT 500");
    });
  });

  describe("rejects destructive operations", () => {
    const destructiveQueries: [string, string][] = [
      ["INSERT", "INSERT INTO transaction (id) VALUES ('x')"],
      ["UPDATE", "UPDATE transaction SET amount = 0"],
      ["DELETE", "DELETE FROM transaction"],
      ["DROP", "DROP TABLE transaction"],
      ["CREATE", "CREATE TABLE hacked (id text)"],
      ["ALTER", "ALTER TABLE transaction ADD COLUMN hacked text"],
      ["TRUNCATE", "TRUNCATE transaction"],
      ["GRANT", "GRANT ALL ON transaction TO public"],
      ["REVOKE", "REVOKE SELECT ON transaction FROM agent_readonly"],
    ];

    for (const [keyword, query] of destructiveQueries) {
      it(`rejects ${keyword}`, () => {
        expect(() => safeReadOnlyQuery(query)).toThrow(
          "Only read-only queries"
        );
      });
    }
  });

  describe("rejects dangerous functions", () => {
    const dangerousFunctions = [
      "pg_read_file",
      "pg_read_binary_file",
      "lo_import",
      "lo_export",
      "pg_ls_dir",
      "pg_stat_file",
      "dblink",
      "dblink_exec",
      "pg_sleep",
    ];

    for (const fn of dangerousFunctions) {
      it(`rejects ${fn}()`, () => {
        expect(() => safeReadOnlyQuery(`SELECT ${fn}('/etc/passwd')`)).toThrow(
          "Only read-only queries"
        );
      });
    }
  });

  describe("rejects SET ROLE", () => {
    it("rejects SET ROLE escalation", () => {
      expect(() => safeReadOnlyQuery("SELECT 1; SET ROLE postgres")).toThrow();
    });
  });

  describe("rejects non-SELECT queries", () => {
    it("rejects plain text", () => {
      expect(() => safeReadOnlyQuery("hello world")).toThrow(
        "Only read-only queries"
      );
    });

    it("rejects EXPLAIN without SELECT prefix", () => {
      expect(() =>
        safeReadOnlyQuery("EXPLAIN SELECT * FROM transaction")
      ).toThrow("Only read-only queries");
    });
  });

  describe("single statement enforcement", () => {
    it("rejects multi-statement queries", () => {
      expect(() =>
        safeReadOnlyQuery("SELECT 1; SELECT * FROM transaction")
      ).toThrow("Only a single SQL statement is allowed");
    });

    it("allows trailing semicolons", () => {
      const result = safeReadOnlyQuery("SELECT 1;");
      expect(result).toBe("SELECT 1 LIMIT 500");
    });

    it("allows multiple trailing semicolons", () => {
      const result = safeReadOnlyQuery("SELECT 1;;;");
      expect(result).toBe("SELECT 1 LIMIT 500");
    });
  });

  describe("LIMIT enforcement", () => {
    it("appends LIMIT when missing", () => {
      const result = safeReadOnlyQuery("SELECT * FROM transaction");
      expect(result).toBe("SELECT * FROM transaction LIMIT 500");
    });

    it("preserves existing LIMIT", () => {
      const result = safeReadOnlyQuery("SELECT * FROM transaction LIMIT 10");
      expect(result).toBe("SELECT * FROM transaction LIMIT 10");
    });

    it("uses custom limit parameter", () => {
      const result = safeReadOnlyQuery("SELECT * FROM transaction", 50);
      expect(result).toBe("SELECT * FROM transaction LIMIT 50");
    });

    it("preserves existing LIMIT even with custom parameter", () => {
      const result = safeReadOnlyQuery(
        "SELECT * FROM transaction LIMIT 10",
        50
      );
      expect(result).toBe("SELECT * FROM transaction LIMIT 10");
    });
  });

  describe("comment stripping", () => {
    it("strips single-line comments", () => {
      const result = safeReadOnlyQuery(
        "SELECT * FROM transaction -- this is a comment"
      );
      expect(result).toBe("SELECT * FROM transaction LIMIT 500");
    });

    it("strips block comments", () => {
      const result = safeReadOnlyQuery(
        "SELECT /* sneaky DELETE */ * FROM transaction"
      );
      expect(result).toBe("SELECT  * FROM transaction LIMIT 500");
    });

    it("rejects destructive keywords hidden in queries after comment stripping", () => {
      expect(() =>
        safeReadOnlyQuery("SELECT 1 -- ignore\n; DELETE FROM transaction")
      ).toThrow();
    });
  });
});
