import { describe, expect, test } from "bun:test";

import { hasValidBearerToken } from "./auth";

/* oxlint-disable vitest/prefer-importing-vitest-globals -- This isolated harness uses Bun's test runner. */
describe("hasValidBearerToken", () => {
  test("accepts the configured bearer token", async () => {
    const headers = new Headers({ authorization: "Bearer expected-token" });

    expect(await hasValidBearerToken(headers, "expected-token")).toBe(true);
  });

  test("fails closed when the secret is not configured", async () => {
    const headers = new Headers({ authorization: "Bearer expected-token" });

    expect(await hasValidBearerToken(headers)).toBe(false);
  });

  test("rejects missing and malformed authorization headers", async () => {
    expect(await hasValidBearerToken(new Headers(), "expected-token")).toBe(false);
    expect(
      await hasValidBearerToken(
        new Headers({ authorization: "Basic expected-token" }),
        "expected-token",
      ),
    ).toBe(false);
  });
});
