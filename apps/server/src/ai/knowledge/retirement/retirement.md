---
id: retirement
title: Retirement Planning
description: Use when user asks about 401(k), IRA, Roth vs Traditional, employer match, RMDs, Social Security claiming, FRA, withdrawal sequence, 4% rule, Roth conversion ladder, mega backdoor, HSA as retirement. Concepts only.
keywords: 401k, IRA, Roth, Traditional, contribution limits, employer match, vesting, RMD, required minimum distribution, Social Security, FRA, full retirement age, claiming age, withdrawal sequence, safe withdrawal rate, 4% rule, Trinity, bucket strategy, Roth conversion, mega backdoor, 457b, 403b, HSA
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 590-A (Contributions to IRAs)"
    url: "https://www.irs.gov/forms-pubs/about-publication-590-a"
  - name: "IRS Pub 590-B (Distributions, RMD)"
    url: "https://www.irs.gov/forms-pubs/about-publication-590-b"
  - name: "IRS Pub 575 (Pensions and Annuities)"
    url: "https://www.irs.gov/forms-pubs/about-publication-575"
  - name: "IRS COLA / contribution limits"
    url: "https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions"
  - name: "SSA benefits planner"
    url: "https://www.ssa.gov/benefits/retirement/planner/"
  - name: "SSA FRA / early-late table"
    url: "https://www.ssa.gov/oact/quickcalc/early_late.html"
  - name: "Bogleheads safe withdrawal rates"
    url: "https://www.bogleheads.org/wiki/Safe_withdrawal_rates"
---

# Retirement Planning

For current limits, RMD tables, FRA, and figures, `webFetch` source URLs above. Do not paraphrase law/figures from memory.

## When to use

- Account choice: 401(k) / 403(b) / 457(b) / IRA / Roth / HSA
- Roth vs Traditional contribution
- Employer match + vesting questions
- RMD timing and mechanics
- Social Security claiming age / FRA / spousal
- Withdrawal sequencing in retirement
- 4% rule / safe withdrawal rate discussion
- Roth conversion ladder framing
- Mega backdoor Roth eligibility
- HSA as long-term retirement vehicle

## Required inputs (ASK if missing)

- Age, planned retirement age, life-expectancy assumption
- Current marginal bracket, expected retirement bracket
- Account inventory via `cobalt.accounts.list` (401k, IRA, Roth, HSA, taxable)
- Employer plan: match formula, vesting schedule, after-tax allowed (mega backdoor)
- Filing status (Roth IRA phaseout, SS taxability)
- Spouse plan / SS history if married
- Pension expected (if any)

## STOP — refer to CPA/CFP

- Pension actuarial lump-sum vs annuity election
- NUA (net unrealized appreciation) on employer stock in 401(k)
- Inherited IRA complex rules (SECURE 2.0 10-year, eligible designated beneficiary categories)
- QDRO divorce splits
- RMD aggregation across plan types (IRA aggregable, 401k not — case-specific)
- Specific Roth conversion dollar amounts across multi-year tax plan

Respond: "Needs a licensed CPA or CFP — can explain the concept but not your number."

## Workflow

1. Inventory accounts via `cobalt.accounts.list`.
2. Capture employer match terms → contribute at least to full match.
3. Determine Roth vs Traditional via bracket-now vs bracket-later (decision below).
4. Check Roth IRA income eligibility via `webFetch` Pub 590-A.
5. Accumulation order: 401k match → HSA (if HDHP) → IRA/Roth → 401k remainder → mega backdoor if available → taxable.
6. For RMD age users: pull `cobalt.figures.rmdDivisor({ age })` against prior-year-end balance.
7. For SS claim: compare claim ages via SSA calculator; consider longevity, spousal, taxation of benefits.
8. For withdrawal: sequence taxable → tax-deferred → Roth (general default; varies by bracket-smoothing).
9. Disclaimer: educational; planner builds the dollar number.

### Current status: partial

- `cobalt.accounts.list` wired
- `cobalt.figures.contributionLimits` / `rmdDivisor` not yet wired
- No Roth conversion break-even calc yet
- No SS taxability calc yet

## Decision: Roth vs Traditional

```
IF current marginal bracket < expected retirement bracket → Roth
ELIF current marginal bracket > expected retirement bracket → Traditional
ELIF early career / low bracket / long horizon → Roth bias
ELIF peak-earnings year → Traditional bias
ELSE → split (tax diversification)
```

For depth: `webFetch` IRS Pub 590-A.

## Decision: Social Security claiming age

```
IF expect short longevity OR need cash flow → claim earlier (reduced benefit)
ELIF expect normal/long longevity AND can defer → delay toward 70 for delayed credits
ELIF lower-earning spouse with higher-earning partner → coordinate; lower may claim earlier
ELSE → run SSA calculator with assumptions
```

For depth: `webFetch` SSA benefits planner.

## Decision: withdrawal sequence (default)

```
1. RMDs first (mandatory)
2. Taxable accounts (use basis, harvest gains at low brackets)
3. Tax-deferred (401k/Trad IRA) — manage bracket fill
4. Roth last (tax-free growth, no RMD on Roth IRA)
EXCEPTION: bracket-smoothing via Roth conversions in low-income years
```

For depth: `webFetch` Bogleheads SWR page.

## Hard rules

- `[HARD]` Never state contribution limits / RMD divisors / FRA from memory — fetch
- `[HARD]` Capture full employer match before any other voluntary saving (except CC debt)
- `[HARD]` Roth conversion is irrevocable post-TCJA (no recharacterization)
- `[HARD]` 60-day rollover rule and one-per-year IRA rollover — flag risk
- `[RULE]` HSA triple-tax-advantaged; treat as retirement account if cash flow allows
- `[RULE]` Mega backdoor requires plan-level after-tax + in-service conversion features
- `[RULE]` Pro-rata rule on backdoor Roth if pre-tax IRA balances exist

## Common mistakes

- Skipping employer match
- Backdoor Roth with pre-tax IRA balance → pro-rata surprise
- Claiming SS at 62 by default without longevity analysis
- Missing first RMD deadline (special April-1 rule for first year)
- Treating HSA as use-it-or-lose-it (it's not; FSA is)
- Roth conversion in high-income year (defeats purpose)
- Forgetting state tax treatment differs (e.g. PA, NJ on contributions)

## Cross-refs

- `taxes-federal` — bracket fill, ordinary income on withdrawals
- `taxes-strategies` — Roth conversion ladder, bracket-smoothing, TLH
- `investing` — asset location across account types
- `medicare` — claiming + IRMAA interactions
- `healthcare` — pre-65 ACA subsidy interaction with conversions

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.contributionLimits({ type, year })` → `{ employee, catchup, total }`
- `cobalt.figures.rmdDivisor({ age })` → number
- `cobalt.calc.retirement.rmd({ priorYearEndBalance, age })` → number
- `cobalt.calc.retirement.rothConversionBreakeven({ currentBracket, futureBracket, horizon })` → years
- `cobalt.calc.retirement.socialSecurityTaxable({ benefit, otherIncome, filing })` → taxable portion
- `cobalt.calc.tvm.fv({ pv, pmt, rate, nper })` → number
- `cobalt.calc.tvm.pv({ fv, rate, nper })` → number
