import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuth } from "./helpers/better-auth";

describe("invite post-signup hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-redeems a pending email-targeted invite when the recipient signs up", async () => {
    const { client, signInWithTestUser, mocks } = await createTestAuth();

    // Inviter creates the invite.
    const { headers: inviterHeaders } = await signInWithTestUser();
    const create = await client.invite.create({
      fetchOptions: { headers: inviterHeaders },
      targetEmail: "newuser@example.com",
    });
    const token = create.data?.invite.token;
    expect(token).toBeTruthy();

    // Recipient (signed out) hits /invite/activate → plugin stashes token
    // in a signed cookie. Capture the Set-Cookie so we can replay it on the
    // subsequent signup request.
    const stashHeaders = new Headers();
    const stash = await client.invite.activate({
      fetchOptions: {
        onSuccess: (ctx) => {
          const setCookie = ctx.response.headers.get("set-cookie");
          if (setCookie) {
            stashHeaders.append("cookie", setCookie);
          }
        },
      },
      token: token ?? "",
    });
    expect(stash.data?.accepted).toBeFalsy();
    expect(stash.data && "requiresAuth" in stash.data && stash.data.requiresAuth).toBeTruthy();

    // Sign up the recipient w/ matching email. The post-signup `after`
    // hook reads the cookie set above, validates the invite, calls onAccept.
    await client.signUp.email({
      email: "newuser@example.com",
      fetchOptions: { headers: stashHeaders },
      name: "New User",
      password: "secret-123",
    });

    expect(mocks.onAccept).toHaveBeenCalledOnce();
  });
});
