import { defineQueries } from "@rocicorp/zero";

import { accountsQueries } from "./accounts/queries.js";
import { alertsQueries } from "./alerts/queries.js";
import { brokerageQueries } from "./brokerage/queries.js";
import { categoriesQueries } from "./categories/queries.js";
import { chatsQueries } from "./chats/queries.js";
import { newsQueries } from "./news/queries.js";
import { tagsQueries } from "./tags/queries.js";
import { transactionsQueries } from "./transactions/queries.js";

/** Root query registry — add domain modules alongside `transactions`. */
export const queries = defineQueries({
  accounts: accountsQueries,
  alerts: alertsQueries,
  brokerage: brokerageQueries,
  categories: categoriesQueries,
  chats: chatsQueries,
  news: newsQueries,
  tags: tagsQueries,
  transactions: transactionsQueries,
});
