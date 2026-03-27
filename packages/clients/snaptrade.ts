import { env } from "@cobalt-web/env/server";
import { Snaptrade } from "snaptrade-typescript-sdk";

export const snaptradeClient = new Snaptrade({
  clientId: env.SNAPTRADE_CLIENT_ID,
  consumerKey: env.SNAPTRADE_CONSUMER_KEY,
});
