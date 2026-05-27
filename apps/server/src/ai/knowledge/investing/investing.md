---
id: investing
title: Investing Fundamentals
description: Use when user asks about asset allocation, diversification, index vs active, ETF vs mutual fund, expense ratios, rebalancing, lump sum vs DCA, risk tolerance. Concepts and process only — no stock picks or forecasts.
keywords: asset allocation, diversification, stocks, bonds, cash, index funds, active funds, ETF, mutual fund, expense ratio, factor investing, rebalancing, lump sum, DCA, dollar cost averaging, risk tolerance, three fund portfolio
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "Bogleheads wiki"
    url: "https://www.bogleheads.org/wiki/Main_Page"
  - name: "Vanguard principles for investing success"
    url: "https://investor.vanguard.com/investor-resources-education/principles-for-investing-success"
  - name: "SEC investor.gov"
    url: "https://www.investor.gov/"
  - name: "Morningstar fund glossary"
    url: "https://www.morningstar.com/investing-glossary"
  - name: "Three-fund portfolio"
    url: "https://www.bogleheads.org/wiki/Three-fund_portfolio"
---

# Investing Fundamentals

For concept depth or current figures, `webFetch` source URLs above. Do not paraphrase law/figures from memory.

## When to use

- User asks about allocation across stocks/bonds/cash
- Index vs active, ETF vs mutual fund, expense ratio impact
- Rebalancing cadence, drift thresholds
- Lump sum vs dollar-cost averaging
- Risk tolerance, time horizon, glide path
- Factor tilts (value, size, quality, momentum)

## Required inputs (ASK if missing)

- Time horizon (years until money needed)
- Goal (retirement, house, general wealth)
- Existing accounts and rough allocation
- Risk tolerance — qualitative + max drawdown user can stomach
- Tax location of dollars (taxable vs tax-advantaged)

## STOP — refer to CFP

- "Should I buy <ticker> now?" — no individual picks
- Market timing / forecasts / predictions
- Crypto positioning, options strategies, leverage
- Concentrated single-stock unwind plans (cross to `investing-equity-compensation`)
- Margin, shorting, derivatives

Respond: "Needs a licensed CFP — can explain the concept but not your number."

## Workflow

1. Confirm goal + horizon. Short horizon (<3y) → cash/short bonds, not equities.
2. Pull current allocation via `cobalt.brokerage.positions` (when wired).
3. Identify drift from target. Flag if any single position over concentration threshold.
4. For fund choice: compare expense ratios via Morningstar; lower wins absent strong reason.
5. For lump sum vs DCA: explain trade-off (expected return vs regret minimization); cite Vanguard study via `webFetch`.
6. Recommend rebalance via tax-advantaged accounts first to avoid capital gains.
7. Disclaimer: educational, not personalized advice.

### Current status: partial

- `cobalt.brokerage.positions` partially wired (Plaid investments)
- TVM calcs (`fv`, `npv`, `irr`) not yet exposed
- No portfolio rebalance calc yet

## Decision: ETF vs mutual fund

```
IF taxable account + identical strategy → ETF (tax efficiency)
ELIF 401k menu only offers mutual funds → use mutual fund
ELIF auto-invest small recurring contributions → mutual fund (fractional, no spread)
ELSE → ETF default
```

For depth: `webFetch` Morningstar fund glossary.

## Decision: rebalance trigger

```
IF drift > absolute band on major asset class → rebalance
ELIF calendar (annual/semi) AND any drift → rebalance
ELSE → leave alone
```

For depth: `webFetch` Bogleheads rebalancing page.

## Hard rules

- `[HARD]` Never recommend a specific ticker as a buy/sell
- `[HARD]` Never forecast returns or market direction
- `[HARD]` Disclose: past performance is not future results
- `[RULE]` Lower expense ratio wins absent specific reason
- `[RULE]` Tax-advantaged space first for bonds/REITs (tax-inefficient)
- `[RULE]` Concentrated single-stock over portfolio threshold → flag risk

## Common mistakes

- Confusing diversification with owning many similar funds
- Chasing past performance (five-star Morningstar trap)
- Rebalancing in taxable account triggering needless gains
- Treating bond allocation as fixed regardless of horizon
- Ignoring expense ratio compounding drag

## Cross-refs

- `investing-budgeting` — savings rate feeds contributions
- `retirement` — account-type prioritization
- `taxes-capital-gains` — rebalance tax impact
- `taxes-strategies` — asset location, TLH
- `investing-equity-compensation` — concentrated single-stock
- `reference-financial-ratios` — drawdown, Sharpe, vol

## Function dependencies (future, tracked in Linear)

- `cobalt.brokerage.positions()` → `{ accountId, ticker, qty, costBasis, marketValue }[]`
- `cobalt.research.quote(ticker)` → `{ price, asOf }`
- `cobalt.calc.tvm.fv({ pv, pmt, rate, nper })` → number
- `cobalt.calc.tvm.npv({ rate, cashflows })` → number
- `cobalt.calc.tvm.irr({ cashflows })` → number
- `cobalt.calc.portfolio.rebalance({ positions, target })` → trade list
