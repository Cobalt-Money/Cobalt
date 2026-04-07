import { defineQueries } from "@rocicorp/zero";

import { accountsQueries } from "./accounts/queries.js";
import { chatsQueries } from "./chats/queries.js";
import { transactionsQueries } from "./transactions/queries.js";

/** Root query registry — add domain modules alongside `transactions`. */
export const queries = defineQueries({
  accounts: accountsQueries,
  chats: chatsQueries,
  transactions: transactionsQueries,
});
