import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

const FINANCIAL_EVENTS_LIMIT = 300;
const RSS_SIDEBAR_LIMIT = 18;

/**
 * News area — `queries.news.*`
 * Financial events (`financial_events` + `event_articles`) and RSS sidebar items (`rss_articles`).
 */
export const newsQueries = {
  /** Single financial event by primary key (includes related `articles`). */
  eventById: defineQuery(z.object({ eventId: z.string() }), ({ ctx, args }) =>
    zql.financialEvents
      .where("id", ctx?.userId ? args.eventId : NO_MATCH_ID)
      .related("articles", (q) => q.orderBy("date", "desc")),
  ),

  events: defineQuery(({ ctx }: { ctx: Context }) => {
    const base = zql.financialEvents
      .related("articles", (q) => q.orderBy("date", "desc"))
      .orderBy("date", "desc")
      .limit(FINANCIAL_EVENTS_LIMIT);
    return ctx?.userId ? base : base.where("id", NO_MATCH_ID);
  }),

  rssSidebar: defineQuery(({ ctx }: { ctx: Context }) => {
    const base = zql.rssArticles.orderBy("publishedDate", "desc").limit(RSS_SIDEBAR_LIMIT);
    return ctx?.userId ? base : base.where("id", NO_MATCH_ID);
  }),
};
