import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite/activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redeems an open invite for a signed-in user + calls onAccept", async () => {
    const { client, signInWithTestUser, sessionSetter, mocks } = await createTestAuth();

    const { headers: inviterHeaders } = await signInWithTestUser();
    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
    });
    expect(create.data).toBeTruthy();
    const token = create.data?.invite.token;

    // Sign up a second user (the redeemer). Capture session cookies via
    // Better Auth's `sessionSetter` helper — same pattern as plugin tests
    // in the Better Auth monorepo (anonymous, organization, etc).
    const redeemerHeaders = new Headers();
    await client.signUp.email({
      email: "bob@example.com",
      fetchOptions: {
        onSuccess: sessionSetter(redeemerHeaders),
      },
      name: "Bob",
      password: "bob-password-123",
    });

    const res = await client.invite.activate({
      fetchOptions: { headers: redeemerHeaders },
      token: token ?? "",
    });

    expect(res.error).toBeNull();
    expect(res.data?.accepted).toBeTruthy();
    expect(mocks.onAccept).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        invite: expect.objectContaining({ token }),
      }),
    );
  });

  it("rejects expired tokens", async () => {
    const { client, signInWithTestUser, db } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    const create = await client.invite.create({ fetchOptions: { headers } });
    const inviteId = create.data?.invite.id;
    const inviteToken = create.data?.invite.token;
    expect(inviteId).toBeTruthy();
    expect(inviteToken).toBeTruthy();

    // Backdate expiry.
    await db.update({
      model: "socialInvite",
      update: { expiresAt: new Date(Date.now() - 1000) },
      where: [{ field: "id", value: inviteId ?? "" }],
    });

    const res = await client.invite.activate({ token: inviteToken ?? "" });
    expect(res.error?.status).toBe(400);
    expect(res.error?.message).toMatch(/expired/i);
  });

  it("blocks self-redeem", async () => {
    const { client, signInWithTestUser } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    const create = await client.invite.create({ fetchOptions: { headers } });
    const inviteToken = create.data?.invite.token;
    expect(inviteToken).toBeTruthy();

    const res = await client.invite.activate({
      fetchOptions: { headers },
      token: inviteToken ?? "",
    });
    expect(res.error?.status).toBe(400);
    expect(res.error?.message).toMatch(/own invite/i);
  });
});
