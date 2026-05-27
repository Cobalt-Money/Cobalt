---
id: investing-budgeting
title: Budgeting & Cash Flow
description: Use when user asks about budget categories, 50/30/20, savings rate, emergency fund sizing, cash flow, sinking funds, spending breakdown. Personal household scope only.
keywords: budget, budgeting, 50/30/20, savings rate, emergency fund, cash flow, sinking fund, spending categories, where does my money go, monthly expenses, fixed vs variable
status: partial
jurisdiction: US
last_reviewed: 2026-05-27
sources:
  - name: "CFPB budget worksheet"
    url: "https://www.consumerfinance.gov/consumer-tools/budgeting/"
  - name: "FDIC Money Smart"
    url: "https://www.fdic.gov/resources/consumers/money-smart/"
  - name: "Bogleheads emergency fund"
    url: "https://www.bogleheads.org/wiki/Emergency_fund"
---

# Budgeting & Cash Flow

For concept depth or worksheets, `webFetch` source URLs above. Do not paraphrase from memory.

## When to use

- User wants spending breakdown by category
- "Where does my money go" / cash flow analysis
- Emergency fund sizing guidance
- Savings rate target / how much to save
- 50/30/20 or zero-based budget framing
- Sinking funds for known future expenses
- Fixed vs variable expense classification

## Required inputs (ASK if missing)

- Linked accounts (checking, credit cards) — confirm via `cobalt.accounts.list`
- Time window (last 1, 3, 12 months)
- Income source(s) — W-2, 1099, irregular
- Household composition (single, couple, dependents) — affects fund sizing
- Job stability — single vs dual income, contractor vs employee → fund multiple

## STOP — refer to CFP or attorney

- Divorce alimony / child-support budget allocation
- Business cash-flow forecasting (separate entity books)
- Complex multi-household income splits
- Debt-collection / garnishment-driven cash flow (legal aid)

Respond: "Needs a licensed CFP or attorney — can explain the concept but not your number."

## Workflow

1. Pull transactions via `cobalt.transactions.list({ from, to })`.
2. Group by `cobalt.categories.list` taxonomy. Surface top 5 categories.
3. Net income from inflow categories. Subtract outflows.
4. Compute savings rate = (income − spend) / income. Flag if negative.
5. Estimate monthly fixed (rent, utilities, insurance, debt min) vs variable.
6. Emergency fund target = N × monthly fixed (N depends on stability, see decision).
7. Compare current cash balance via `cobalt.snapshots.balances` vs target.
8. Disclaimer: educational; user owns final allocation.

### Current status: partial

- `transactions.list`, `accounts.list`, `categories.list`, `snapshots.balances` wired
- No budget-target persistence yet
- No sinking-fund tracker yet

## Decision: emergency fund size

```
IF dual income + stable W-2 + low fixed costs → lower end
ELIF single income OR variable income (1099, commission) → higher end
ELIF self-employed / sole earner / dependents → highest end
ELSE → start at one month, build from there
```

For depth: `webFetch` Bogleheads emergency fund.

## Decision: budget framework

```
IF user wants simple → 50/30/20 (needs/wants/savings+debt)
ELIF user wants control → zero-based (every dollar assigned)
ELIF user has irregular income → percentage-based on each paycheck
ELSE → category caps on top 5 variable categories
```

For depth: `webFetch` CFPB worksheets.

## Hard rules

- `[HARD]` Never categorize transactions as "wasteful" — neutral language
- `[HARD]` Don't compute emergency fund off gross income; use monthly fixed expenses
- `[RULE]` Savings rate before allocation — rate matters more than vehicle early on
- `[RULE]` High-interest debt payoff before fully funding emergency target (see `investing-debt-management`)
- `[RULE]` Sinking funds for large annual irregulars (insurance, car reg, holidays)

## Common mistakes

- Using gross income for 50/30/20 instead of net
- Sizing emergency fund off total spend incl. discretionary → over-saves cash
- Treating credit card balance paid in full as "debt"
- Ignoring annual lumpy expenses
- Counting 401k match in savings rate denominator

## Cross-refs

- `investing` — once budget surplus exists, where it goes
- `investing-debt-management` — high-interest debt vs savings priority
- `retirement` — savings rate target for retirement adequacy

## Function dependencies (future, tracked in Linear)

- `cobalt.transactions.list({ from, to, accountIds? })` → tx[]
- `cobalt.snapshots.balances({ at })` → `{ accountId, balance }[]`
- `cobalt.categories.list()` → category tree
- `cobalt.accounts.list()` → `{ id, type, subtype, institution }[]`
