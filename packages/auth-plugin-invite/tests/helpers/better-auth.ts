import { getTestInstance } from "better-auth/test";
import { vi } from "vitest";

import { invite } from "../../src";
import { inviteClient } from "../../src/client";
import type { InviteOptions, OnAcceptCallback } from "../../src/types";

const noopOnAccept: OnAcceptCallback = vi.fn().mockResolvedValue();

export const defaultOptions: InviteOptions = {
  inviteUrlBase: "https://example.test/invite",
  onAccept: noopOnAccept,
};

export async function createTestAuth(overrides?: Partial<InviteOptions>) {
  const onAccept = vi.fn().mockResolvedValue();
  const sendInvite = vi.fn().mockResolvedValue();
  const onRevoke = vi.fn().mockResolvedValue();
  const onDecline = vi.fn().mockResolvedValue();

  const opts: InviteOptions = {
    ...defaultOptions,
    onAccept,
    onDecline,
    onRevoke,
    sendInvite,
    ...overrides,
  };

  const ctx = await getTestInstance(
    {
      plugins: [invite(opts)],
    },
    {
      clientOptions: { plugins: [inviteClient()] },
    },
  );

  return { ...ctx, mocks: { onAccept, onDecline, onRevoke, sendInvite } };
}
