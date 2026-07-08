---
id: product-readme
title: Cobalt Product Reference
description: Overview of Cobalt app features, integrations, and how users interact with it (MCP, mobile, web). Includes external docs links.
keywords: cobalt, product, app, features, integrations, MCP, mobile, web, accounts, transactions, brokerage, tags, docs
status: partial
jurisdiction: US
last_reviewed: 2026-07-08
---

# Cobalt Product Reference

Facts about Cobalt app itself — features, integrations, surfaces. Use when
user asks _how do I do X in Cobalt_ or _does Cobalt support Y_.

## Product surfaces

- **Web app** — primary UI. Accounts, transactions, tags, budgets, AI chat.
- **Mobile app** — native iOS on App Store: https://apps.apple.com/app/id6757945133 (Android not yet shipped).
- **MCP server** — hosted at `https://api.cobaltpf.com/api/mcp`. Any
  MCP-capable AI agent (Claude, ChatGPT, Cursor, Claude Code, VS Code, Codex,
  Gemini, Amp, OpenCode, Zed) can query user's financial data via
  `cobalt_execute_code`. **When user asks how to connect / install / use
  Cobalt MCP, or asks about the `cobalt.*` SDK, use `webSearch` to fetch
  https://docs.cobaltpf.com/docs/mcp and answer from that page. Cite it with
  the `<cite …>` tag.**
- **AI chat** — in-app chat backed by finance agent (this agent).

## Data sources

- **Plaid** — bank accounts, credit cards, loans, transactions.
- **SnapTrade** — brokerage accounts, positions, activities, portfolio
  snapshots.
- **Research** — global market data (quotes, overview, news), not user-scoped.

## External docs (fetch via `webSearch`)

- MCP server: https://docs.cobaltpf.com/docs/mcp — install per client, OAuth
  flow, `cobalt_execute_code` tool, full `cobalt.*` SDK (accounts,
  transactions, tags, brokerage, research, snapshots), security model,
  troubleshooting.
