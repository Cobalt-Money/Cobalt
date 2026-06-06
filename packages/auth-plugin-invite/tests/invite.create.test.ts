import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an open share-link invite (no target → maxUses defaults to 10)", async () => {
    const { client, signInWithTestUser } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    const res = await client.invite.create({
      fetchOptions: { headers },
    });

    expect(res.error).toBeNull();
    expect(res.data?.invite.maxUses).toBe(10);
    expect(res.data?.invite.targetUserId).toBeNull();
    expect(res.data?.invite.targetEmail).toBeNull();
    expect(res.data?.url).toMatch(/^https:\/\/example\.test\/invite\/.+$/);
  });

  it("creates a targeted invite with maxUses=1 when targetEmail set", async () => {
    const { client, signInWithTestUser, mocks } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    const res = await client.invite.create({
      fetchOptions: { headers },
      targetEmail: "bob@example.com",
    });

    expect(res.error).toBeNull();
    expect(res.data?.invite.maxUses).toBe(1);
    expect(res.data?.invite.targetEmail).toBe("bob@example.com");
    expect(mocks.sendInvite).toHaveBeenCalledOnce();
  });

  it("rejects kind outside allowedKinds when configured", async () => {
    const { client, signInWithTestUser } = await createTestAuth({
      allowedKinds: ["friendship", "family"],
    });
    const { headers } = await signInWithTestUser();

    const res = await client.invite.create({
      fetchOptions: { headers },
      kind: "team",
    });

    expect(res.error).not.toBeNull();
    expect(res.error?.status).toBe(400);
  });
});
