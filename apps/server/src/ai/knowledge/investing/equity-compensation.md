---
id: investing-equity-compensation
title: Equity Compensation
description: Use when user asks about RSU, ISO, NSO, ESPP, §83(b), AMT on ISO exercise, vesting, sell-to-cover, qualifying disposition, IPO lockup, 10b5-1. Concepts only — refer multi-year AMT/strategy to CPA.
keywords: RSU, ISO, NSO, NQSO, ESPP, 83(b), AMT, alternative minimum tax, vesting, cliff, double trigger, sell to cover, qualifying disposition, disqualifying disposition, IPO lockup, 10b5-1, secondary sale, exercise, strike price
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 525 (Taxable and Nontaxable Income)"
    url: "https://www.irs.gov/forms-pubs/about-publication-525"
  - name: "IRS Topic No. 427 (Stock options)"
    url: "https://www.irs.gov/taxtopics/tc427"
  - name: "IRS Form 3921 (ISO exercise)"
    url: "https://www.irs.gov/forms-pubs/about-form-3921"
  - name: "SEC Rule 10b5-1 amendments"
    url: "https://www.sec.gov/rules-regulations/2022/12/insider-trading-arrangements-related-disclosures"
  - name: "IRS §83(b) election"
    url: "https://www.irs.gov/businesses/section-83-b-election"
---

# Equity Compensation

For tax treatment, holding-period rules, and figures, `webFetch` source URLs above. Do not paraphrase law from memory.

## When to use

- RSU vesting / sell-to-cover decisions
- ISO exercise timing, AMT trigger awareness
- NSO exercise mechanics
- ESPP qualifying vs disqualifying disposition
- §83(b) election for early-exercise / restricted stock
- Double-trigger RSU (private co)
- Post-IPO lockup planning
- 10b5-1 plan general purpose
- Tender / secondary sale concept

## Required inputs (ASK if missing)

- Grant type (RSU / ISO / NSO / ESPP / restricted stock)
- Vesting schedule (cliff, monthly, milestones, double-trigger)
- Exercise price (options) and FMV at relevant date
- Company stage (private / public, IPO date, lockup end)
- Existing concentration vs other holdings
- Filing status, marginal bracket (for tax modeling)
- Insider / 10b5-1 plan status

## STOP — refer to CPA/CFP/attorney

- Multi-year ISO exercise AMT optimization
- AMT credit recovery planning across years
- 409A valuation disputes
- M&A acceleration / single-trigger interpretation (legal counsel)
- Founder stock / dual-class structuring
- Cross-border equity comp (treaty, mobility)
- Specific exercise dollar amount recommendations

Respond: "Needs a licensed CPA or attorney — can explain the concept but not your number."

## Workflow

1. Identify grant type and stage. Tax treatment diverges sharply (see decision).
2. For RSU: vest = ordinary income at FMV; cost basis resets.
3. For ISO: flag AMT preference item on exercise-and-hold; route AMT calc to STOP gate.
4. For NSO: ordinary income at exercise on bargain element.
5. For ESPP: determine qualifying vs disqualifying — different ordinary/capital split.
6. For early-exercise: §83(b) deadline is 30 days from grant — flag urgency.
7. Concentration check via `cobalt.brokerage.positions`. Flag if single-stock over threshold.
8. For sell decisions, ref `taxes-capital-gains` for ST vs LT treatment.
9. Disclaimer: educational; CPA models the dollar number.

### Current status: partial

- `cobalt.brokerage.positions` partial (Plaid investments)
- `cobalt.tax.amt` not yet wired — STOP and refer
- No RSU vest tax-impact calc yet

## Decision: ISO exercise + hold vs exercise + sell

```
IF exercise-and-sell same year → no AMT preference; ordinary income on bargain element (disqualifying)
ELIF exercise-and-hold → AMT preference on bargain element; potential AMT due
  → MUST refer to CPA for multi-year AMT modeling
ELSE → wait, model first
```

For depth: `webFetch` IRS Topic 427.

## Decision: §83(b) election

```
IF early-exercise OR restricted stock grant AND FMV ≈ strike (low spread) → strong case to file
ELIF FMV >> strike → 83(b) creates immediate ordinary income; usually skip unless strong upside thesis
ELSE → consult CPA before 30-day deadline
```

For depth: `webFetch` IRS §83(b) page.

## Decision: RSU sell-at-vest vs hold

```
IF would-not-buy-equivalent-with-cash (concentration test) → sell at vest
ELIF strong restricted view AND under concentration limit → hold
ELSE → default sell at vest, redeploy diversified
```

For depth: `webFetch` Bogleheads via `investing`.

## Hard rules

- `[HARD]` Never compute exact AMT due — refer to CPA
- `[HARD]` §83(b) 30-day deadline is statutory; flag immediately
- `[HARD]` Disqualifying ISO disposition reclassifies tax — must report
- `[HARD]` Insider trading laws apply; 10b5-1 plans are SEC-regulated — don't advise on timing around MNPI
- `[RULE]` "Would I buy this stock with cash today?" test for hold decisions
- `[RULE]` Concentration over portfolio threshold = flag risk

## Common mistakes

- Missing §83(b) 30-day window
- Holding ISO exercise into next year without AMT model → surprise tax bill
- Selling ESPP one day before qualifying → losing favorable treatment
- Treating RSU vest as "free money" (ordinary income; default withholding often under-withholds)
- Trading on MNPI; not understanding 10b5-1 cooling-off

## Cross-refs

- `taxes-federal` — ordinary income inclusion
- `taxes-capital-gains` — holding period mechanics
- `taxes-strategies` — TLH, asset location of post-sale proceeds
- `investing` — diversification post-sale

## Function dependencies (future, tracked in Linear)

- `cobalt.brokerage.positions()` → positions inc. employer ticker
- `cobalt.tax.amt({ year, inputs })` → STOP gate in v1 (returns refer-to-CPA)
- `cobalt.calc.equity.rsuTaxImpact({ shares, fmv, withholding, bracket })` → estimated under-withhold
