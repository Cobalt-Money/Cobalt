import { describe, expect, test } from "bun:test";

import {
  deriveSandboxId,
  deriveStoragePrefixes,
  signRequest,
  verifySignedRequest,
} from "./security";

const scope = {
  userId: "user@example.com",
  workspaceId: "123e4567-e89b-42d3-a456-426614174000",
} as const;

/* oxlint-disable vitest/prefer-importing-vitest-globals -- This Worker package uses Bun's test runner. */

describe("workspace scope security", () => {
  test("derives a stable opaque sandbox ID from the complete scope", async () => {
    const first = await deriveSandboxId(scope);
    const second = await deriveSandboxId(scope);
    const otherUser = await deriveSandboxId({ ...scope, userId: "other@example.com" });

    expect(first).toBe(second);
    expect(first).toMatch(/^ws-[a-f0-9]{64}$/);
    expect(first).not.toBe(otherUser);
    expect(first).not.toContain(scope.userId);
    expect(first).not.toContain(scope.workspaceId);
  });

  test("derives isolated uploads and outputs prefixes", () => {
    expect(deriveStoragePrefixes(scope)).toEqual({
      outputs:
        "/users/dXNlckBleGFtcGxlLmNvbQ/workspaces/123e4567-e89b-42d3-a456-426614174000/outputs/",
      uploads:
        "/users/dXNlckBleGFtcGxlLmNvbQ/workspaces/123e4567-e89b-42d3-a456-426614174000/uploads/",
    });
  });
});

describe("signed request authentication", () => {
  test("accepts a current signature over method, path, timestamp, and body", async () => {
    const body = JSON.stringify({ hello: "world" });
    const timestamp = "1786939200000";
    const signature = await signRequest("secret", "POST", "/v1/bridge", timestamp, body);

    expect(
      await verifySignedRequest({
        body,
        headers: new Headers({
          "x-cobalt-signature": signature,
          "x-cobalt-timestamp": timestamp,
        }),
        method: "POST",
        now: 1_786_939_200_000,
        pathname: "/v1/bridge",
        secret: "secret",
      }),
    ).toBe(true);
  });

  test("rejects unsigned, stale, and body-tampered requests", async () => {
    const timestamp = "1786939200000";
    const signature = await signRequest("secret", "POST", "/v1/bridge", timestamp, "original");

    expect(
      await verifySignedRequest({
        body: "original",
        headers: new Headers(),
        method: "POST",
        now: 1_786_939_200_000,
        pathname: "/v1/bridge",
        secret: "secret",
      }),
    ).toBe(false);
    expect(
      await verifySignedRequest({
        body: "original",
        headers: new Headers({
          "x-cobalt-signature": signature,
          "x-cobalt-timestamp": timestamp,
        }),
        method: "POST",
        now: 1_786_939_200_000 + 5 * 60_000 + 1,
        pathname: "/v1/bridge",
        secret: "secret",
      }),
    ).toBe(false);
    expect(
      await verifySignedRequest({
        body: "tampered",
        headers: new Headers({
          "x-cobalt-signature": signature,
          "x-cobalt-timestamp": timestamp,
        }),
        method: "POST",
        now: 1_786_939_200_000,
        pathname: "/v1/bridge",
        secret: "secret",
      }),
    ).toBe(false);
  });
});
