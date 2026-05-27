---
id: taxes-self-employment
title: Self-Employment Tax
description: Use when user has 1099-NEC/MISC, Schedule C, side gig, freelance, contractor, sole prop, single-member LLC. Covers SE tax, home office, vehicle, QBI (§199A), quarterly estimates, S-corp election, solo 401(k) / SEP. Multi-member LLC partnerships, S-corp reasonable comp disputes, foreign SE → STOP.
keywords: self-employment, SE tax, 1099, Schedule C, sole prop, LLC, home office, vehicle deduction, QBI, 199A, quarterly estimated tax, safe harbor, S-corp election, solo 401k, SEP IRA, FICA
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 334 (Tax Guide for Small Business)"
    url: "https://www.irs.gov/forms-pubs/about-publication-334"
  - name: "Schedule C (Form 1040) instructions"
    url: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040"
  - name: "IRS Topic 554 (Self-Employment Tax)"
    url: "https://www.irs.gov/taxtopics/tc554"
  - name: "Qualified Business Income Deduction (§199A)"
    url: "https://www.irs.gov/newsroom/qualified-business-income-deduction"
  - name: "Form 1040-ES (Estimated Tax)"
    url: "https://www.irs.gov/forms-pubs/about-form-1040-es"
---

# Self-Employment Tax

For concept depth or current figures, `webFetch` the source URLs above. Do not paraphrase law from memory.

## When to use

- 1099-NEC / 1099-MISC / 1099-K income
- Sole prop or single-member LLC (default disregarded)
- Side gig + W-2 day job
- SE tax (~15.3%) question
- Home office or vehicle deduction
- QBI deduction (§199A)
- Quarterly estimated tax / safe harbor
- S-corp election decision
- Solo 401(k) vs SEP IRA choice

## Required inputs (ASK if missing)

- `filing_status` + `year`
- Gross SE revenue (cash + 1099s)
- Business expenses (categorized to Sch C lines)
- W-2 wages (already covered by FICA up to SS wage base)
- Other ordinary income (joint context)
- For home office: sq ft (office / total), exclusive use
- For vehicle: business miles vs total, actual cost vs std mileage
- SSTB? (health, law, consult, financial — affects QBI phaseout)

## STOP — refer to CPA

- Multi-member LLC / partnership (Form 1065 + K-1)
- S-corp reasonable comp disputes
- Foreign self-employment / FEIE interplay
- Inventory / §263A capitalization
- Hobby vs business reclassification audit risk
- Depreciation w/ §179 + bonus on big asset
- Cost-segregation studies
- Nexus / sales tax across states

Respond: "Needs a licensed CPA — can explain the concept but not your number."

## Workflow

1. Gather **Required inputs**; ASK if missing.
2. Check **STOP** list.
3. Net SE = revenue − Sch C expenses.
4. SE tax = 92.35% × net SE × (SS + Medicare rate); SS portion capped at wage base (subtract W-2 wages already against cap).
5. Half SE tax → above-the-line adjustment to AGI.
6. QBI: (when wired) `cobalt.tax.qbi({netSE, taxableIncome, status, sstb})` — phaseouts apply.
7. Roll into federal calc via `cobalt.tax.federalIncome` for ordinary brackets.
8. Quarterly safe harbor: pay 100%/110% of prior-year tax OR 90% of current. `cobalt.tax.safeHarborQuarterly` when wired.
9. Disclaimer: "Estimate only — not tax advice."

### Current status: partial

`cobalt.tax.fica` (selfEmployed flag), `cobalt.tax.qbi`, `cobalt.tax.safeHarborQuarterly` not yet wired. Walk methodology; cite Pub 334 + Topic 554 for current rates / wage base.

## Decision: S-corp election

```
IF net SE consistently > ~$80k AND owner-operator
  → analyze S-corp election (save on SE tax via reasonable salary + distributions)
  → adds payroll cost, separate return (1120-S), state nuance → CPA gate
ELSE → stay sole prop / SMLLC
```

For depth: `webFetch` Pub 334 + escalate to CPA.

## Decision: solo 401(k) vs SEP

```
IF no employees AND want Roth option / loans → solo 401(k)
IF want max simplicity, no plan doc, low admin → SEP IRA
both let employer-side contributions up to ~25% of net SE
solo 401(k) also allows employee deferral (lets lower-earners contribute more)
```

For depth: `webFetch` IRS retirement plans for self-employed.

## Hard rules

- `[HARD]` SE tax applies to net SE earnings — not gross revenue.
- `[HARD]` SS portion of SE tax stops at annual SS wage base; Medicare portion has no cap (+ 0.9% addt'l above threshold).
- `[HARD]` Half SE tax = above-the-line deduction (reduces AGI, not Sch C net).
- `[HARD]` Home office: exclusive + regular use; simplified method ($/sq ft) OR actual.
- `[HARD]` Vehicle: cannot mix std mileage and actual in same year for same vehicle once chosen.
- `[HARD]` QBI is below-the-line; SSTB phases out at higher income.
- `[RULE]` Set aside ~25–30% of net SE for taxes (fed + SE + state).
- `[RULE]` Quarterly due ~Apr 15 / Jun 15 / Sep 15 / Jan 15 — late = penalty.

## Common mistakes

- Forgetting SE tax on top of income tax (~15% surprise)
- Deducting commute mileage (not deductible)
- Home office w/o exclusive-use (kitchen table fails)
- Treating 1099 gross as taxable income (skipping expenses)
- Missing quarterly estimates → underpayment penalty
- Assuming all LLC income qualifies for QBI (SSTB phaseout)
- S-corp w/ unreasonably low salary (IRS reclass risk)

## Cross-refs

- `taxes-federal` — ordinary brackets apply to net SE
- `taxes-strategies` — solo 401(k) bracket fill, S-corp election
- `taxes-state` — state SE / franchise tax (CA $800 LLC, NYC UBT)
- `retirement` — solo 401(k), SEP, SIMPLE
- `investing-budgeting` — quarterly tax reserves

## Function dependencies (future, tracked in Linear)

- `cobalt.tax.fica({wages, selfEmployed: true, year, w2Wages?})` → `{ssTax, medicareTax, addtlMedicare, _meta}`
- `cobalt.tax.qbi({netSE, taxableIncome, status, sstb, year})` → `{deduction, _meta}`
- `cobalt.tax.safeHarborQuarterly({priorYearTax, currentYearProj, agiPriorYear, year})` → `{q1, q2, q3, q4, _meta}`
- `cobalt.figures.contributionLimits({year, planType})` → solo 401(k) / SEP / SIMPLE
