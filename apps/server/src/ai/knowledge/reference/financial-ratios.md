---
id: reference-financial-ratios
title: Financial Ratios & Metrics
description: Use when user asks "what's my savings rate / DTI / emergency fund coverage", or wants ratio formulas (Sharpe, P/E, cap rate, expense ratio, 4% rule, 25× rule, 28/36 housing). Formulas + data dependencies.
keywords: savings rate, DTI, debt to income, emergency fund, liquidity, net worth, expense ratio, Sharpe, P/E, dividend yield, 25x rule, 4 percent rule, 28/36, LTV, cap rate, cash on cash, retirement readiness, replacement rate
status: partial
jurisdiction: US (formulas language-agnostic)
last_reviewed: 2026-05-27
sources:
  - name: "CFPB Financial Well-Being Survey"
    url: "https://www.consumerfinance.gov/data-research/financial-well-being-survey/"
  - name: "Investopedia Ratio Analysis"
    url: "https://www.investopedia.com/terms/r/ratioanalysis.asp"
  - name: "Bogleheads — Safe Withdrawal Rates"
    url: "https://www.bogleheads.org/wiki/Safe_withdrawal_rates"
  - name: "CFP Board"
    url: "https://www.cfp.net/"
---

# Financial Ratios & Metrics

For depth on any ratio's interpretation, `webFetch` Investopedia or Bogleheads. Heuristics ("28/36", "4% rule") are starting points — not laws.

## When to use

- User asks "am I saving enough", "what's my DTI", "do I have enough emergency fund"
- Comparing two funds (expense ratio, Sharpe)
- Sizing housing budget pre-purchase (28/36)
- Retirement-readiness check (25×, 4%, replacement rate)
- Rental property analysis (cap rate, cash-on-cash, LTV)

## Required inputs (ASK if missing)

- Goal of the ratio (decision context, not just curiosity)
- Time window (monthly, annual)
- Gross vs net income (DTI uses gross; savings rate either, be explicit)
- Whether to include employer match in savings rate

## STOP — refer to specialist

- Picking a personal target savings rate / retirement number — requires planner
- Active stock valuation calls based on P/E alone — refer to advisor
- Rental underwriting decisions — refer to local market specialist
- Withdrawal-rate strategy in retirement (sequence-of-returns) — refer to CFP

Respond: "Can compute the ratio — can't pick your target for you."

## Computation patterns

Each block: formula, inputs (`cobalt.*` data feed), interpretation, gotchas.

### Savings rate

```
savingsRate = (contributions + employer_match) / gross_income
```

- Data: `cobalt.transactions.list` (filter retirement/savings transfers), `cobalt.accounts.list` (paycheck source), employer match if available
- Interpretation: heuristic 15%+ for retirement; varies by age and goal
- Gotcha: define numerator clearly (incl. match? incl. brokerage? incl. HSA?)

### Emergency fund coverage (months of expenses)

```
coverageMonths = liquid_assets / avg_monthly_essential_expenses
```

- Data: `cobalt.snapshots.balances` (cash + HYSA), `cobalt.transactions.list` (categorize essentials)
- Interpretation: 3–6 months typical; more if single-income / variable income
- Gotcha: exclude credit lines from "liquid"; essential vs total expenses

### Liquidity ratio

```
liquidityRatio = liquid_assets / monthly_expenses
```

- Same as emergency fund but framed as a ratio (no months unit)

### Debt-to-Income (DTI)

```
front-end DTI = housing_PITI / gross_monthly_income
back-end DTI  = (housing_PITI + all_other_debt_min_payments) / gross_monthly_income
```

- Data: `cobalt.accounts.list` (loan accounts → min payment), `cobalt.transactions.list` (rent/mortgage)
- Interpretation: 28/36 rule (front-end ≤28%, back-end ≤36%); lenders vary
- Gotcha: gross not net; include HOA, taxes, insurance in PITI; min payments not actual payments

### Net worth growth rate

```
nwGrowthRate_yoy = (NW_now - NW_year_ago) / NW_year_ago
```

- Data: `cobalt.snapshots.balances` over time
- Gotcha: contributions inflate growth — separate market gains from new savings if user asks

### Expense ratio (fund)

```
expenseRatio = annual_fund_expenses / fund_assets
```

- Pulled from fund prospectus, not computed locally
- Interpretation: <0.10% excellent for index; >1% expensive for typical fund

### Sharpe ratio (intro)

```
sharpe = (portfolio_return - risk_free_rate) / portfolio_stdev
```

- Risk-adjusted return. Higher = better. Use over same window for comparisons.
- Gotcha: requires return history + stdev; don't compute on <1yr data

### P/E ratio

```
P/E = price_per_share / earnings_per_share
```

- Trailing (TTM) vs forward; CAPE smooths cycles
- Interpretation: context-dependent (sector, growth)

### Dividend yield

```
divYield = annual_dividends_per_share / price_per_share
```

### Expense-to-income ratio

```
expRatio = monthly_expenses / monthly_take_home
```

- Data: `cobalt.transactions.list` aggregated
- Complement of savings rate (roughly)

### Retirement readiness — income replacement

```
replacementRate = retirement_income / preretirement_income
```

- Heuristic 70–85% pre-retirement income typical; varies by lifestyle
- Data: `cobalt.calc.tvm.fv` for projected balance, `cobalt.calc.tvm.pmt` for withdrawal

### 25× rule (FI target)

```
fiNumber = annual_expenses_in_retirement * 25
```

- Inverse of 4% rule. Starting heuristic only.
- For depth: `webFetch` Bogleheads safe-withdrawal-rates page.

### 4% rule (withdrawal)

```
year1_withdrawal = portfolio_value * 0.04   # adjust subsequent years for inflation
```

- Trinity Study heuristic; assumes ~30yr horizon, US data
- Gotcha: sequence-of-returns risk; not a guarantee. Refer to CFP for personal use.

### Housing cost 28/36 rule

```
front-end ≤ 28% of gross monthly income
back-end  ≤ 36% of gross monthly income
```

- See DTI above

### LTV (Loan-to-Value)

```
LTV = loan_balance / property_value
```

- Interpretation: >80% conventional → PMI typical; refi options open up below 80%

### Cap rate (rental)

```
capRate = NOI / property_value
NOI = gross_rental_income - operating_expenses   # excludes debt service
```

- Comparing rentals at same point in time; market-dependent
- Gotcha: exclude mortgage payment from NOI

### Cash-on-cash return (rental)

```
cashOnCash = annual_pre_tax_cash_flow / total_cash_invested
```

- Includes leverage effect (unlike cap rate)
- Gotcha: "cash invested" = down payment + closing + immediate repairs, not purchase price

### Current status: partial

- Formulas wired
- `cobalt.calc.tvm.fv` / `pmt` available generically; no ratio-specific calc wrappers yet
- Sharpe / P/E require market-data feed not yet integrated

## Hard rules

- `[HARD]` Heuristics (28/36, 15% savings, 4% rule) are starting points. Do not present as the user's target.
- `[HARD]` DTI uses GROSS income, not net. Verify before computing.
- `[RULE]` Cap rate excludes debt service; cash-on-cash includes it. Don't conflate.
- `[RULE]` Net worth growth has two components (contributions + market). Separate when discussing performance.
- `[RULE]` Sharpe over <1yr data is noise; don't compute or present.

## Common mistakes

- Computing DTI on net income (understates ratio)
- Including credit lines / 401k balance in "liquid emergency fund"
- Counting employer match inconsistently across periods
- Quoting expense ratio in % when source is bps (or vice versa)
- Using current P/E in isolation without sector or growth context
- Cap rate on highly-levered deal → looks bad even if cash-on-cash is great
- Applying 4% rule to <30yr horizon or 100% equity without caveat

## Cross-refs

- `investing` — expense ratio, Sharpe, fund comparison
- `investing-budgeting` — savings rate, emergency fund
- `investing-debt-management` — DTI, payoff priority
- `retirement` — 25×, 4%, replacement rate
- `real-estate` — LTV, cap rate, cash-on-cash, 28/36
- `reference-financial-glossary` — definitions of all terms here

## Function dependencies (future, tracked in Linear)

- `cobalt.transactions.list({range, category})` → expense / savings aggregation
- `cobalt.accounts.list()` → balances, account types, minimum payments
- `cobalt.snapshots.balances({asOf})` → net worth point-in-time
- `cobalt.calc.tvm.fv({pv, pmt, rate, years})` → future-value projection
- `cobalt.calc.tvm.pmt({pv, rate, years})` → withdrawal / payment sizing
- Future: `cobalt.calc.ratios.dti({gross, debts})`, `cobalt.calc.ratios.savingsRate({contribs, gross})`, `cobalt.calc.ratios.emergencyFund({liquid, essentialMonthly})`
