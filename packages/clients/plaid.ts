import { env } from "@cobalt-web/env/server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const plaidConfig = new Configuration({
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
      "PLAID-SECRET": env.PLAID_CLIENT_SECRET,
    },
  },
  basePath: PlaidEnvironments[env.PLAID_ENV as keyof typeof PlaidEnvironments],
});

export const plaidClient = new PlaidApi(plaidConfig);
