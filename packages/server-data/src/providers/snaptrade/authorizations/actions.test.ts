import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import { describe, expect, it, vi } from "vitest";

import { getBrokerageAuthorization, listBrokerageAuthorizations } from "./actions";

vi.mock(import("@cobalt-web/clients/snaptrade"), () => ({
  snaptradeClient: {
    connections: {
      detailBrokerageAuthorization: vi.fn(),
      listBrokerageAuthorizations: vi.fn(),
    },
  } as unknown as (typeof import("@cobalt-web/clients/snaptrade"))["snaptradeClient"],
}));

describe("getBrokerageAuthorization", () => {
  it("fetches one authorization using the provider user credentials", async () => {
    vi.mocked(snaptradeClient.connections.detailBrokerageAuthorization).mockResolvedValueOnce({
      data: { disabled: true, id: "auth-1" },
    } as never);

    const result = await getBrokerageAuthorization("auth-1", {
      providerUserId: "provider-user-1",
      userSecret: "secret-1",
    });

    expect(snaptradeClient.connections.detailBrokerageAuthorization).toHaveBeenCalledWith({
      authorizationId: "auth-1",
      userId: "provider-user-1",
      userSecret: "secret-1",
    });
    expect(result).toStrictEqual({ disabled: true, id: "auth-1" });
  });
});

describe("listBrokerageAuthorizations", () => {
  it("fetches every authorization using the provider user credentials", async () => {
    vi.mocked(snaptradeClient.connections.listBrokerageAuthorizations).mockResolvedValueOnce({
      data: [
        { disabled: true, id: "auth-1" },
        { disabled: false, id: "auth-2" },
      ],
    } as never);

    const result = await listBrokerageAuthorizations({
      providerUserId: "provider-user-1",
      userSecret: "secret-1",
    });

    expect(snaptradeClient.connections.listBrokerageAuthorizations).toHaveBeenCalledWith({
      userId: "provider-user-1",
      userSecret: "secret-1",
    });
    expect(result).toStrictEqual([
      { disabled: true, id: "auth-1" },
      { disabled: false, id: "auth-2" },
    ]);
  });
});
