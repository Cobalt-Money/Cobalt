import { snaptradeClient } from "@cobalt-web/clients/snaptrade";

interface UserCreds {
  providerUserId: string;
  providerUserSecret: string;
}

/** Remove a brokerage authorization on SnapTrade's side. */
export async function removeBrokerageAuthorization(
  authorizationId: string,
  creds: UserCreds
): Promise<void> {
  await snaptradeClient.connections.removeBrokerageAuthorization({
    authorizationId,
    userId: creds.providerUserId,
    userSecret: creds.providerUserSecret,
  });
}
