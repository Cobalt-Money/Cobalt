import { defineQueries } from "@rocicorp/zero";

import { transactionsQueries } from "./transactions/queries.js";

/** Root query registry — add domain modules alongside `transactions`. */
export const queries = defineQueries({
  transactions: transactionsQueries,
});
