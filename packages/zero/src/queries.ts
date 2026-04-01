import { defineQueries } from "@rocicorp/zero";

import { chatsQueries } from "./chats/queries.js";
import { transactionsQueries } from "./transactions/queries.js";

/** Root query registry — add domain modules alongside `transactions`. */
export const queries = defineQueries({
  chats: chatsQueries,
  transactions: transactionsQueries,
});
