import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite recipient gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects WRONG_RECIPIENT when targetEmail set + session email mismatches", async () => {
    const { client, signInWithTestUser, sessionSetter, mocks } = await createTestAuth();
    const { headers: inviterHeaders } = await signInWithTestUser();

    await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
      targetEmail: "intended@example.com",
    });
    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
      targetEmail: "intended@example.com",
    });
    const token = create.data?.invite.token ?? "";

    // Sign in as someone OTHER than intended@.
    const interloperHeaders = new Headers();
    await client.signUp.email({
      email: "interloper@example.com",
      fetchOptions: { onSuccess: sessionSetter(interloperHeaders) },
      name: "Eve",
      password: "eve-password-123",
    });

    const res = await client.invite.activate({
      fetchOptions: { headers: interloperHeaders },
      token,
    });
    expect(res.error?.status).toBe(403);
    expect(mocks.onAccept).not.toHaveBeenCalled();
  });

  it("idempotent: same user re-hitting activate succeeds without re-firing onAccept", async () => {
    const { client, signInWithTestUser, sessionSetter, mocks } = await createTestAuth({
      defaultMaxUsesOpen: 10,
    });
    const { headers: inviterHeaders } = await signInWithTestUser();

    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
    });
    const token = create.data?.invite.token ?? "";

    const bobHeaders = new Headers();
    await client.signUp.email({
      email: "bob@example.com",
      fetchOptions: { onSuccess: sessionSetter(bobHeaders) },
      name: "Bob",
      password: "bob-password-123",
    });

    const first = await client.invite.activate({
      fetchOptions: { headers: bobHeaders },
      token,
    });
    expect(first.data?.accepted).toBeTruthy();

    const second = await client.invite.activate({
      fetchOptions: { headers: bobHeaders },
      token,
    });
    expect(second.error).toBeNull();
    expect(second.data?.accepted).toBeTruthy();
    // onAccept fires once even though activate was called twice — the second
    // call short-circuits on the existing redemption row.
    expect(mocks.onAccept).toHaveBeenCalledOnce();
  });
});
