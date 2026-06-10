import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a decline + suppresses the invite from listPending", async () => {
    const { client, signInWithTestUser, sessionSetter, mocks } = await createTestAuth();
    const { headers: inviterHeaders } = await signInWithTestUser();

    const targetEmail = "bob@example.com";
    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
      targetEmail,
    });
    const inviteId = create.data?.invite.id ?? "";
    expect(inviteId).toBeTruthy();

    const redeemerHeaders = new Headers();
    await client.signUp.email({
      email: targetEmail,
      fetchOptions: { onSuccess: sessionSetter(redeemerHeaders) },
      name: "Bob",
      password: "bob-password-123",
    });

    const before = await client.invite.pending({
      fetchOptions: { headers: redeemerHeaders },
    });
    expect(before.data?.invites.length).toBe(1);

    const res = await client.invite.decline({
      fetchOptions: { headers: redeemerHeaders },
      inviteId,
    });
    expect(res.error).toBeNull();
    expect(res.data?.declined).toBeTruthy();
    expect(res.data?.firstTime).toBeTruthy();
    expect(mocks.onDecline).toHaveBeenCalledOnce();

    const after = await client.invite.pending({
      fetchOptions: { headers: redeemerHeaders },
    });
    expect(after.data?.invites.length).toBe(0);
  });

  it("is idempotent — second decline returns firstTime=false", async () => {
    const { client, signInWithTestUser, sessionSetter, mocks } = await createTestAuth();
    const { headers: inviterHeaders } = await signInWithTestUser();

    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
    });
    const inviteId = create.data?.invite.id ?? "";

    const redeemerHeaders = new Headers();
    await client.signUp.email({
      email: "bob@example.com",
      fetchOptions: { onSuccess: sessionSetter(redeemerHeaders) },
      name: "Bob",
      password: "bob-password-123",
    });

    await client.invite.decline({
      fetchOptions: { headers: redeemerHeaders },
      inviteId,
    });
    const second = await client.invite.decline({
      fetchOptions: { headers: redeemerHeaders },
      inviteId,
    });
    expect(second.data?.declined).toBeTruthy();
    expect(second.data?.firstTime).toBeFalsy();
    expect(mocks.onDecline).toHaveBeenCalledOnce();
  });

  it("blocks the inviter from declining their own invite", async () => {
    const { client, signInWithTestUser } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    const create = await client.invite.create({ fetchOptions: { headers } });
    const inviteId = create.data?.invite.id ?? "";

    const res = await client.invite.decline({
      fetchOptions: { headers },
      inviteId,
    });
    expect(res.error?.status).toBe(400);
  });

  it("blocks decline by a non-target user when invite is targeted", async () => {
    const { client, signInWithTestUser, sessionSetter } = await createTestAuth();
    const { headers: inviterHeaders } = await signInWithTestUser();

    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
      targetEmail: "bob@example.com",
    });
    const inviteId = create.data?.invite.id ?? "";

    const eveHeaders = new Headers();
    await client.signUp.email({
      email: "eve@example.com",
      fetchOptions: { onSuccess: sessionSetter(eveHeaders) },
      name: "Eve",
      password: "eve-password-123",
    });

    const res = await client.invite.decline({
      fetchOptions: { headers: eveHeaders },
      inviteId,
    });
    expect(res.error?.status).toBe(403);
  });
});
