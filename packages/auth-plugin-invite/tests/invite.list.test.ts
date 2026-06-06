import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite/list (sent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invites the caller created", async () => {
    const { client, signInWithTestUser } = await createTestAuth();
    const { headers } = await signInWithTestUser();

    await client.invite.create({ fetchOptions: { headers } });
    await client.invite.create({
      fetchOptions: { headers },
      targetEmail: "bob@example.com",
    });

    const res = await client.invite.list({ fetchOptions: { headers } });
    expect(res.error).toBeNull();
    expect(res.data?.invites).toHaveLength(2);
  });

  it("does not surface invites created by other users", async () => {
    const { client, signInWithTestUser, sessionSetter } = await createTestAuth();
    const { headers: aHeaders } = await signInWithTestUser();
    await client.invite.create({ fetchOptions: { headers: aHeaders } });

    const bHeaders = new Headers();
    await client.signUp.email({
      email: "bob@example.com",
      fetchOptions: { onSuccess: sessionSetter(bHeaders) },
      name: "Bob",
      password: "bob-password-123",
    });

    const res = await client.invite.list({ fetchOptions: { headers: bHeaders } });
    expect(res.error).toBeNull();
    expect(res.data?.invites).toHaveLength(0);
  });
});
