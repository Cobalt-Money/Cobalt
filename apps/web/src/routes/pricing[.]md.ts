import { createFileRoute } from "@tanstack/react-router";

const MONTHLY_PRICE = 6.99;
const ANNUAL_PRICE = 70;
const ANNUAL_EFFECTIVE_MONTHLY = +(ANNUAL_PRICE / 12).toFixed(2);

const MARKDOWN = `# Cobalt Pricing

Two plans. Monthly or annual billing.

## Free — $0

Free for everyone.

- 2 synced bank or brokerage connections
- Unlimited manual accounts
- Budgets, categories, rules, AI chat
- AI on Claude Haiku 4.5
- Use Cobalt API to build your own finance apps
- Curated news, research, and market insights

## Pro

- $${MONTHLY_PRICE} per month, billed monthly
- $${ANNUAL_EFFECTIVE_MONTHLY} per month, billed yearly ($${ANNUAL_PRICE}/yr)

Everything in Free, plus:

- Unlimited synced bank + brokerage
- Any Claude model + Analyst mode + extended thinking
- CSV export
- Early access to new features

## Security

Bank-level security. Data encrypted at rest with AES-256 and in transit with TLS 1.2+.

## Get started

- Sign up: https://cobaltpf.com/login
- Compare: https://cobaltpf.com/pricing
`;

export const Route = createFileRoute("/pricing.md")({
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
