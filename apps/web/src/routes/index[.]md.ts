import { createFileRoute } from "@tanstack/react-router";

const MARKDOWN = `# Cobalt

Personal finance app for web and mobile. Manage your money the traditional way — and unlock a new way by talking to your finances through AI.

## Try without signing up

Cobalt has a live demo on the landing page at https://cobaltpf.com. No account required. When ready, sign in or sign up at https://cobaltpf.com/login.

## Manage your finances the traditional way

- Add bank and brokerage accounts via Plaid, or add manual accounts
- Track transactions, edit them, add notes and tags
- Set up budgets, categories, and rules
- Track subscriptions and recurring spend
- Investment and brokerage tracking
- Curated news, research, and market insights
- Web app and native iOS app

Everything you expect from a budgeting app — transactions, accounts, subscriptions — works out of the box.

## Manage your finances through AI

Cobalt is built so AI can do real work on your money, not just chat about it. Two ways:

1. **Built-in AI.** Chat directly in the Cobalt app. Free tier runs on Claude Haiku 4.5; Pro unlocks any Claude model with Analyst mode and extended thinking.
2. **Your favorite chatbot.** Any tool that supports MCP (Claude, Claude Code, Cursor) or can write code (ChatGPT, etc.) can read and update your Cobalt data through the public API. Update a transaction, add a note, ask a complex question grounded in your real spending — from wherever you already work.

## Build your own finance app

Finances are unique to every person. No single dashboard or chart fits everyone. Cobalt provides the bare necessities — a clean API and SDK — so you can design the visualizations and workflows you want.

With modern AI coding tools, ask the assistant to use the Cobalt SDK and ship a custom finance app for yourself. The data is yours; the UI is up to you.

## Plans

- Free: 2 synced connections, AI on Claude Haiku 4.5, full API and MCP access
- Pro: unlimited connections, any Claude model + Analyst mode + extended thinking, CSV export

See [/pricing.md](https://cobaltpf.com/pricing.md).

## Security

- Bank-level security. AES-256 at rest, TLS 1.2+ in transit
- Source open under AGPL-3.0: https://github.com/Cobalt-Money/Cobalt

## Links

- App: https://cobaltpf.com
- Sign in: https://cobaltpf.com/login
- API: https://api.cobaltpf.com
- Docs: https://docs.cobaltpf.com
- MCP: https://docs.cobaltpf.com/mcp
- SDK: https://docs.cobaltpf.com/sdk
`;

export const Route = createFileRoute("/index.md")({
  server: {
    handlers: {
      GET: () =>
        new Response(MARKDOWN, {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=3600",
            "Content-Type": "text/markdown; charset=utf-8",
          },
        }),
    },
  },
});
