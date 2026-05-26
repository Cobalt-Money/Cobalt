![Cobalt](apps/web/public/og-image.png)

<p align="center">
  <h1 align="center"><b>Cobalt</b></h1>
  <p align="center">
    Open-source AI personal finance management.
    <br />
    <br />
    <a href="https://cobaltpf.com">Website</a>
    ·
    <a href="https://github.com/Cobalt-Money/Cobalt/issues">Issues</a>
    ·
    <a href="./SECURITY.md">Security</a>
  </p>
</p>

## About

Cobalt connects your financial accounts — manually or through Plaid and SnapTrade — and uses AI to analyze, budget, and track spending. **Money transfers and spending are not possible from inside Cobalt.** The hosted product at [cobaltpf.com](https://cobaltpf.com) is the only supported deployment.

## Features

- **Account aggregation** — Plaid (US banks, credit cards, loans) + SnapTrade (brokerage) + manual entry
- **AI assistant** — natural-language Q&A over your finances, zero data retention via [Vercel AI Gateway](https://vercel.com/docs/ai-gateway/privacy)
- **Transactions & budgets** — categorize, tag, search, export
- **Net worth tracking** — daily snapshots across all accounts
- **CSV import** — bring history from Mint, YNAB, Monarch
- **Subscriptions** — recurring transaction detection
- **Real-time sync** — Rocicorp Zero replication, optimistic UI
- **Raycast extension** — query Cobalt from your launcher

## Architecture

- Monorepo (Turborepo + Bun)
- React 19 + TanStack Start (web)
- Hono + Nitro (server)
- Rocicorp Zero (sync)
- Drizzle ORM + PostgreSQL
- shadcn/ui + Tailwind 4
- Better Auth (Google + Apple sign-in)
- Vercel Workflow DevKit (durable jobs)

### Hosting

- Vercel (web, server, docs)
- PlanetScale (Postgres)
- Railway (zero-cache replication)
- Cloudflare Workers (agent sandbox)

### Services

- Plaid (US bank connections)
- SnapTrade (brokerage)
- Vercel AI Gateway (LLM routing, zero retention)
- Stripe (subscriptions)
- Vercel Blob (file uploads)

## License

[AGPL-3.0](./LICENSE). This repo is **source-available for transparency** so users and security researchers can audit how Cobalt handles financial data. Self-hosting is unsupported — see [`docs/oss/SCOPE.md`](./docs/oss/SCOPE.md). Contributing? Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`RELICENSING.md`](./RELICENSING.md) (DCO sign-off required).

## Disclaimer

Cobalt is **not financial, investment, tax, or legal advice**. The software is provided "as is", without warranty. Use the hosted product or use this code at your own risk.
