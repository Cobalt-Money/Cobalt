import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const FINANCIAL_EVENTS_LIMIT = 50;
const RSS_SIDEBAR_LIMIT = 18;

/**
 * News area — `queries.news.*`
 * Financial events (`financial_events` + `event_articles`) and RSS sidebar items (`rss_articles`).
 */
export const newsQueries = {
  /** Single financial event by primary key (includes related `articles`). */
  eventById: defineQuery(z.object({ eventId: z.string() }), ({ ctx, args }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialEvents.where("id", NO_MATCH_ID);
    }
    return zql.financialEvents
      .where("id", args.eventId)
      .related("articles", (q) => q.orderBy("date", "desc"));
  }),

  events: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.financialEvents.where("id", NO_MATCH_ID);
    }
    return zql.financialEvents
      .related("articles", (q) => q.orderBy("date", "desc"))
      .orderBy("date", "desc")
      .limit(FINANCIAL_EVENTS_LIMIT);
  }),

  rssSidebar: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.rssArticles.where("id", NO_MATCH_ID);
    }
    return zql.rssArticles
      .orderBy("publishedDate", "desc")
      .limit(RSS_SIDEBAR_LIMIT);
  }),
};
