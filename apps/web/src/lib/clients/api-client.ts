import { env } from "@cobalt-web/env/web";
import { hc } from "hono/client";
import type {
  AccountsRouter,
  AlertsRouter,
  AppstoreRouter,
  BrokerageRouter,
  CategoriesRouter,
  ChatRouter,
  InstitutionsRouter,
  NewsRouter,
  PlaidRouter,
  ResearchRouter,
  SnaptradeRouter,
  SubscriptionsRouter,
  TagsRouter,
  TransactionsRouter,
  UserRouter,
} from "server/index.ts";

// Hono RPC "split your app into multiple files" pattern for large apps.
// https://hono.dev/docs/guides/rpc#split-your-app-into-multiple-files
//
// One `hc<Router>()` proxy per feature, each rooted at its sub-router's
// mount path. Using a single `hc<AppType>()` for the whole server hits
// TS2589 ("Type instantiation is excessively deep") because the merged
// schema across 14 sub-routers is too recursive for `tsc` to resolve in
// one go. Per-feature proxies keep each schema computation shallow.
//
// `authRouter` and `zeroRouter` are intentionally not exposed — Better
// Auth ships its own client and Zero uses its own push transport, so
// neither is called through Hono RPC from the web app.

const url = env.VITE_SERVER_URL;
const init = { init: { credentials: "include" } } as const;

export const accountsApi = hc<AccountsRouter>(`${url}/api/accounts`, init);
export const alertsApi = hc<AlertsRouter>(`${url}/api/alerts`, init);
export const appstoreApi = hc<AppstoreRouter>(`${url}/api/appstore`, init);
export const brokerageApi = hc<BrokerageRouter>(`${url}/api/brokerage`, init);
export const categoriesApi = hc<CategoriesRouter>(`${url}/api/categories`, init);
export const chatApi = hc<ChatRouter>(`${url}/api/chat`, init);
export const institutionsApi = hc<InstitutionsRouter>(`${url}/api/institutions`, init);
export const newsApi = hc<NewsRouter>(`${url}/api/news`, init);
export const plaidApi = hc<PlaidRouter>(`${url}/api/plaid`, init);
export const researchApi = hc<ResearchRouter>(`${url}/api/research`, init);
export const snaptradeApi = hc<SnaptradeRouter>(`${url}/api/snaptrade`, init);
export const subscriptionsApi = hc<SubscriptionsRouter>(`${url}/api/subscriptions`, init);
export const tagsApi = hc<TagsRouter>(`${url}/api/tags`, init);
export const transactionsApi = hc<TransactionsRouter>(`${url}/api/transactions`, init);
export const userApi = hc<UserRouter>(`${url}/api/user`, init);
