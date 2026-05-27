---
id: investing-debt-management
title: Debt Management
description: Use when user asks about paying off debt vs investing, avalanche vs snowball, refi, mortgage prepayment, student loan PSLF/SAVE/IBR, credit card consolidation, HELOC. Educational only.
keywords: debt payoff, avalanche, snowball, refinance, mortgage prepayment, student loans, PSLF, SAVE, IBR, IDR, credit card consolidation, HELOC, debt vs invest, interest rate comparison
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "CFPB debt help"
    url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/"
  - name: "Federal Student Aid repayment"
    url: "https://studentaid.gov/manage-loans/repayment"
  - name: "Bogleheads paying down loans vs investing"
    url: "https://www.bogleheads.org/wiki/Paying_down_loans_versus_investing"
---

# Debt Management

For current rates, plan rules, and figures, `webFetch` source URLs above. Do not paraphrase from memory.

## When to use

- "Pay off debt vs invest" prioritization
- Avalanche (highest APR) vs snowball (smallest balance) framing
- Mortgage prepayment / recasting / refi break-even
- Student loan: standard vs income-driven (IBR/PAYE/SAVE), PSLF eligibility check
- Credit card balance transfer / consolidation loan analysis
- HELOC use case (debt consolidation, home improvement)
- Comparing rate vs expected investment return

## Required inputs (ASK if missing)

- Each loan: balance, rate (APR), min payment, type (fixed/variable), tax-deductibility
- Employment sector (PSLF: public service / 501c3)
- Employer 401k match — never skip free match
- Emergency fund status — must have baseline cash first
- Refi: closing costs, new rate, expected time-in-home

## STOP — refer to attorney

- Bankruptcy (Ch 7 vs 13) strategy
- Debt settlement legal negotiation
- Wage garnishment / collections lawsuits
- Statute of limitations questions
- Cosigner release disputes

Respond: "Needs a licensed attorney — can explain the concept but not your number."

## Workflow

1. List debts via `cobalt.accounts.list` (loan + credit subtypes). Confirm APRs.
2. Verify emergency fund baseline (see `investing-budgeting`).
3. Capture employer 401k match — fund up to match before extra debt payoff.
4. For each debt: compute payoff schedule via `cobalt.calc.tvm.nper` / `pmt`.
5. Apply decision tree below to set priority order.
6. For refi: break-even = closing costs / monthly savings; compare to expected tenure.
7. For federal student loans: check PSLF eligibility via studentaid.gov before consolidating (consolidation can reset count).
8. Disclaimer: educational; rate environment changes.

### Current status: partial

- `cobalt.accounts.list` wired for loan/credit subtypes
- TVM calcs not yet exposed
- No mortgage amortization calc yet

## Decision: debt payoff vs invest

```
IF debt APR > expected long-run equity return (real, after-tax) → pay debt first
ELIF debt is high-APR unsecured (CC) → ALWAYS pay first (after match)
ELIF debt is low-fixed mortgage AND low tax bracket → invest first
ELIF federal student loan on IDR with PSLF track → minimum payment only
ELSE → split; pay min on all, extra to highest after-tax rate
```

For depth: `webFetch` Bogleheads page.

## Decision: avalanche vs snowball

```
IF user is rate-motivated, disciplined → avalanche (highest APR first)
ELIF user needs motivation wins → snowball (smallest balance first)
ELSE → avalanche default
```

## Decision: refi

```
IF (new_rate < current_rate by meaningful margin) AND (months_to_breakeven < expected_tenure) → refi
ELIF cash-out for high-APR debt consolidation AND user disciplined → consider
ELSE → skip
```

## Hard rules

- `[HARD]` Never advise strategic default without attorney
- `[HARD]` Federal student loan benefits (IDR, PSLF, forbearance) lost on private refi — flag explicitly
- `[HARD]` Capture employer match before extra debt payments (except CC)
- `[RULE]` Compare after-tax rates (mortgage interest deductibility if itemizing)
- `[RULE]` Variable-rate debt = higher payoff priority at equal rate
- `[RULE]` HELOC for CC payoff only if behavior root cause solved

## Common mistakes

- Refi federal student loans to private → lose IDR/PSLF/forbearance
- Direct Consolidation resetting PSLF count
- Comparing nominal mortgage rate to nominal equity return (ignore tax + risk)
- Paying extra on mortgage while carrying CC balance
- Ignoring closing costs in refi break-even

## Cross-refs

- `investing` — opportunity cost framing
- `investing-budgeting` — emergency fund prerequisite
- `real-estate` — mortgage refi, HELOC mechanics
- `retirement` — 401k match priority

## Function dependencies (future, tracked in Linear)

- `cobalt.accounts.list()` → loans + credit lines with APR, balance
- `cobalt.calc.tvm.pmt({ pv, rate, nper })` → number
- `cobalt.calc.tvm.ipmt({ pv, rate, nper, period })` → number
- `cobalt.calc.tvm.ppmt({ pv, rate, nper, period })` → number
- `cobalt.calc.tvm.nper({ pv, pmt, rate })` → number
- `cobalt.calc.realestate.mortgagePayment({ principal, rate, termYears })` → amortization schedule
