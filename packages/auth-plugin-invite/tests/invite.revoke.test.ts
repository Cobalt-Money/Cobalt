import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite/revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks invite as revoked when called by the inviter", async () => {
    const { client, signInWithTestUser, db, mocks } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    const create = await client.invite.create({ fetchOptions: { headers } });
    const inviteId = create.data?.invite.id ?? "";
    expect(inviteId).toBeTruthy();

    const res = await client.invite.revoke({
      fetchOptions: { headers },
      inviteId,
    });
    expect(res.error).toBeNull();
    expect(res.data?.revoked).toBeTruthy();

    // Confirm DB row was updated.
    const row = await db.findOne<{ revokedAt: Date | null }>({
      model: "socialInvite",
      where: [{ field: "id", value: inviteId }],
    });
    expect(row?.revokedAt).toBeTruthy();
    expect(mocks.onRevoke).toHaveBeenCalledOnce();
  });

  it("rejects a revoked invite on activate", async () => {
    const { client, signInWithTestUser, sessionSetter } = await createTestAuth();
    const { headers: inviterHeaders } = await signInWithTestUser();

    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
    });
    const inviteId = create.data?.invite.id ?? "";
    const token = create.data?.invite.token ?? "";

    await client.invite.revoke({
      fetchOptions: { headers: inviterHeaders },
      inviteId,
    });

    // Sign in a second user, then try to redeem.
    const redeemerHeaders = new Headers();
    await client.signUp.email({
      email: "bob@example.com",
      fetchOptions: { onSuccess: sessionSetter(redeemerHeaders) },
      name: "Bob",
      password: "bob-password-123",
    });

    const res = await client.invite.activate({
      fetchOptions: { headers: redeemerHeaders },
      token,
    });
    expect(res.error?.status).toBe(400);
    expect(res.error?.message).toMatch(/revoked/i);
  });

  it("blocks non-owner from revoking", async () => {
    const { client, signInWithTestUser, sessionSetter } = await createTestAuth();
    const { headers: inviterHeaders } = await signInWithTestUser();

    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
    });
    const inviteId = create.data?.invite.id ?? "";

    const otherHeaders = new Headers();
    await client.signUp.email({
      email: "eve@example.com",
      fetchOptions: { onSuccess: sessionSetter(otherHeaders) },
      name: "Eve",
      password: "eve-password-123",
    });

    const res = await client.invite.revoke({
      fetchOptions: { headers: otherHeaders },
      inviteId,
    });
    expect(res.error?.status).toBe(403);
  });
});
