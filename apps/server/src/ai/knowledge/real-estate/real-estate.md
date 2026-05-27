---
id: real-estate
title: Real Estate — Mortgage, Ownership, Rentals
description: Use when user asks about rent vs buy, mortgage shopping (rate/points/term), refi breakeven, PMI removal, escrow, property tax appeal, home sale §121 exclusion, depreciation recapture, 1031 exchange intro, cap rate / cash-on-cash, vacation home 14-day rule, HELOC vs cash-out refi, jumbo vs conforming.
keywords: mortgage, refi, refinance, PMI, escrow, property tax, home sale exclusion, section 121, 1031 exchange, depreciation recapture, cap rate, cash-on-cash, vacation home, 14-day rule, HELOC, cash-out refi, jumbo, conforming, FHA, rent vs buy
status: partial
jurisdiction: US
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 523 (Sale of Home, §121)"
    url: "https://www.irs.gov/forms-pubs/about-publication-523"
  - name: "IRS Pub 527 (Residential Rental Property)"
    url: "https://www.irs.gov/forms-pubs/about-publication-527"
  - name: "IRS Pub 936 (Home Mortgage Interest)"
    url: "https://www.irs.gov/forms-pubs/about-publication-936"
  - name: "CFPB Owning a Home"
    url: "https://www.consumerfinance.gov/owning-a-home/"
  - name: "FHFA conforming loan limits"
    url: "https://www.fhfa.gov/data/conforming-loan-limit"
  - name: "HUD FHA loan limits"
    url: "https://entp.hud.gov/idapp/html/hicostlook.cfm"
---

# Real Estate — Mortgage, Ownership, Rentals

For figures (loan limits, mortgage interest cap, §121 thresholds, depreciation recovery period), `webFetch` sources. Do not paraphrase law/figures from memory.

## When to use

- Rent vs buy decision framing
- Mortgage shopping: rate vs points, 15 vs 30, ARM
- Refi breakeven analysis
- PMI removal mechanics (LTV thresholds, BPMI vs LPMI)
- Property tax appeal process
- Home sale §121 exclusion eligibility (ownership + use tests)
- Rental property: cap rate, cash-on-cash, vacation home 14-day rule
- 1031 intro and routing
- HELOC vs cash-out refi tradeoffs

## Required inputs (ASK if missing)

- Purchase price / current value / loan balance
- Down payment %, credit score band, DSCR or DTI
- Loan type (conventional, FHA, VA, jumbo) + county (for limits)
- Holding period (years owned + lived in)
- Filing status (for §121 limit single vs MFJ)
- For rentals: rent, vacancy %, opex, mortgage P&I, depreciation start date
- For refi: new rate, closing costs, planned hold

## STOP — refer to specialist

- 1031 exchange execution → Qualified Intermediary + CPA + RE attorney
- Passive activity loss / material participation edge cases → CPA
- Depreciation recapture on partial business use or §121 + rental mix → CPA
- Foreign rental income (FBAR, FATCA, foreign tax credit) → CPA + international tax
- Syndicated RE partnerships / DSTs → securities attorney + CPA

Respond: "Needs a CPA or RE attorney — can explain the concept but not your number."

## Workflow

1. Classify question (financing / ownership / sale / rental / exchange).
2. Collect inputs above.
3. For mortgage: use `cobalt.calc.tvm.pmt` for P&I; layer T&I + PMI for PITI.
4. For refi: breakeven = closing costs / monthly savings; compare to planned hold.
5. For §121: confirm ownership ≥2 of last 5y AND use ≥2 of last 5y; check prior-exclusion 2-year cooldown. `webFetch` Pub 523.
6. For rental: cap rate = NOI / value; cash-on-cash = pre-tax cash flow / cash invested. Surface depreciation + recapture on exit.
7. For 1031: intro only; route to QI before any sale-side action (cannot touch proceeds).
8. Disclaimer: educational; state law + local appraiser matter.

### Current status: partial

- Mortgage payment: `cobalt.calc.tvm.pmt` (wired)
- Amortization split: `cobalt.calc.tvm.ipmt`, `cobalt.calc.tvm.ppmt` (wired)
- Loan-limit lookup, rent-vs-buy, refi breakeven: planned

## Decision: rent vs buy

```
IF planned hold <5y → rent likely wins (transaction costs ~8–10% of price)
ELSE IF P&I+T&I+maint > rent × 1.3 AND no appreciation conviction → rent
ELSE compute breakeven via NYT-style calc (opportunity cost on down payment matters)
```

For depth: `webFetch` CFPB Owning a Home.

## Decision: 15 vs 30 year mortgage

```
IF disciplined saver AND cash flow tight → 30y, invest the diff
ELSE IF want forced amortization, near retirement, want title clear → 15y
NOTE: 15y rate typically lower; total interest much less
```

## Decision: pay points?

```
IF planned hold > point-breakeven (cost / monthly savings) → buy points
ELSE → take higher rate, keep cash
```

## Decision: HELOC vs cash-out refi

```
IF current mortgage rate << market → HELOC (don't blow up the low rate)
ELSE IF need lump sum AND market rate ≤ current → cash-out refi
HELOC = variable, second lien, flexible draw
Cash-out = fixed (usually), resets clock
```

## Decision: §121 exclusion eligible?

```
IF owned ≥2 of last 5y AND used as primary ≥2 of last 5y AND no §121 use in prior 2y → YES (up to single/MFJ cap)
ELSE check partial exclusion (job/health/unforeseen) per Pub 523
```

For depth: `webFetch` IRS Pub 523.

## Decision: vacation home — personal or rental?

```
IF rented <15 days/yr → income tax-free, no expense deduction (14-day rule)
ELSE IF personal use > 14 days OR 10% of rental days → mixed-use, expenses limited
ELSE → rental property (Schedule E, full depreciation, recapture on sale)
```

For depth: `webFetch` IRS Pub 527.

## Hard rules

- `[HARD]` Never quote conforming/FHA limits, §121 exclusion amount, or mortgage interest cap from memory — `webFetch`.
- `[HARD]` 1031: never touch sale proceeds; QI must hold. 45-day identify / 180-day close. Like-kind = investment/business real property only.
- `[RULE]` Depreciation recapture on rental sale taxed at ordinary income (capped) — even if you didn't claim depreciation, IRS assumes you did ("allowed or allowable").
- `[RULE]` PMI auto-terminates at LTV thresholds set by HPA; borrower can request earlier removal at lower LTV with appraisal.
- `[RULE]` Property tax appeal: deadlines are local + short; comps + condition photos > opinions.

## Common mistakes

- Ignoring opportunity cost of down payment in rent-vs-buy
- Counting full PITI as "building equity" (early years mostly interest)
- Assuming §121 covers depreciation recapture (it doesn't)
- Forgetting depreciation "allowed or allowable" rule
- Treating HELOC interest as deductible without §163(h) check (must be acquisition debt to deduct)
- Missing 1031 ID/close clocks; commingling funds disqualifies
- Buying points when planned hold is short
- Skipping title insurance scrutiny on owner's policy

## Cross-refs

- `taxes-federal` — mortgage interest deduction, SALT cap, itemize vs standard
- `taxes-capital-gains` — §121, depreciation recapture, 1031 deferral
- `investing-debt-management` — mortgage in debt hierarchy, prepay vs invest
- `taxes-state` — property tax appeal, state RE transfer tax

## Function dependencies (future, tracked in Linear)

- `cobalt.calc.tvm.pmt({principal, rate, n})` → monthly payment (wired)
- `cobalt.calc.tvm.ipmt({...})`, `cobalt.calc.tvm.ppmt({...})` (wired)
- `cobalt.calc.realestate.mortgagePayment({price, down, rate, term, taxes, insurance, pmi})` → `{ piti, breakdown }`
- `cobalt.calc.realestate.rentVsBuy({price, rent, hold, rate, appreciation, oppCostRate, ...})` → `{ breakevenYears, npv }`
- `cobalt.figures.conformingLoanLimit({county, year, units})` → `{ conforming, highBalance, fha }`
