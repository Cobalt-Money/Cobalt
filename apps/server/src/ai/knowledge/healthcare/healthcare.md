---
id: healthcare
title: Healthcare Coverage & Tax-Advantaged Accounts
description: Use when user asks about HSA, FSA, HRA, HDHP, ACA marketplace, premium tax credit, subsidy, cost-sharing reduction, COBRA, dependent coverage, open enrollment, Medicaid, CHIP, short-term plans, healthsharing ministries. Pre-65 coverage only — Medicare lives in `medicare`.
keywords: HSA, FSA, HRA, HDHP, ACA, Obamacare, marketplace, premium tax credit, PTC, subsidy, CSR, cost-sharing reduction, COBRA, open enrollment, SEP, Medicaid, CHIP, short-term health, healthsharing, ministry plan, dependent coverage, FPL, MAGI
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "HealthCare.gov"
    url: "https://www.healthcare.gov/"
  - name: "IRS Pub 969 (HSAs, FSAs, MSAs, HRAs)"
    url: "https://www.irs.gov/forms-pubs/about-publication-969"
  - name: "IRS Pub 502 (Medical & Dental Expenses)"
    url: "https://www.irs.gov/forms-pubs/about-publication-502"
  - name: "KFF subsidy calculator"
    url: "https://www.kff.org/interactive/subsidy-calculator/"
  - name: "HHS Federal Poverty Level"
    url: "https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines"
---

# Healthcare Coverage & Tax-Advantaged Accounts

For figures (HSA limits, FPL bands, subsidy phaseouts), `webFetch` sources above. Do not paraphrase law/figures from memory.

## When to use

- User comparing HSA vs FSA vs HRA
- Checking HDHP eligibility for HSA contributions
- ACA marketplace shopping, premium tax credit / CSR questions
- COBRA decisions after job loss
- Adding/removing dependents; open enrollment timing
- Medicaid / CHIP eligibility screening (income only — not asset rules)
- User mentions short-term plans or healthsharing ministries (warn)

## Required inputs (ASK if missing)

- Age (if 65+ → route to `medicare`)
- Household size + filing status
- Estimated MAGI for coverage year
- State of residence (Medicaid + marketplace varies)
- Current coverage type (employer, marketplace, Medicaid, none, COBRA)
- If HSA question: HDHP self-only or family; other disqualifying coverage?

## STOP — refer to specialist

- Specific plan comparison shopping → marketplace navigator / independent broker
- Claim denials, prior-auth appeals → state DOI / patient advocate / attorney
- Medicaid spend-down or asset planning → elder-law attorney
- State-specific Medicaid asset/lookback rules
- Subsidized COBRA via severance negotiation → employment attorney

Respond: "Needs a licensed navigator/broker — can explain the concept but not your number."

## Workflow

1. Identify coverage gap or question type (HSA-eligibility / marketplace subsidy / COBRA vs marketplace / etc.).
2. Collect required inputs above.
3. For HSA-eligibility: confirm HDHP per IRS Pub 969 definition (deductible + OOP max thresholds — `webFetch`); confirm no disqualifying coverage (spouse FSA, Medicare, VA care <3mo).
4. For ACA subsidy: compute household MAGI; compare to FPL via `cobalt.figures.fpl` (when wired) or KFF calculator URL.
5. For COBRA: surface tradeoff vs marketplace SEP (job loss triggers SEP).
6. Flag triple-tax-advantage of HSA (deduct in, grow tax-free, qualified withdrawal tax-free) → cross-ref `taxes-strategies`, `retirement`.
7. Disclaimer: educational, not coverage advice; verify plan docs.

### Current status: partial

- HSA contribution limit lookup: `cobalt.figures.hsaLimit` (planned)
- FPL lookup: `cobalt.figures.fpl` (planned)
- ACA subsidy estimator: future calc fn

## Decision: HSA vs FSA

```text
IF on HDHP AND no disqualifying coverage → HSA preferred (portable, invests, rolls over)
ELSE IF employer offers FSA AND predictable med spend → FSA (use-it-or-lose-it; check grace/carryover)
ELSE IF employer-funded only → HRA (employer rules govern)
```

For depth: `webFetch` IRS Pub 969.

## Decision: COBRA vs marketplace after job loss

```text
IF employer subsidy covers most premium → COBRA short-term
ELSE IF expected MAGI qualifies for PTC → marketplace SEP (60-day window)
ELSE compare total cost (premium + deductible exposure) both routes
```

For depth: `webFetch` HealthCare.gov SEP rules.

## Decision: healthsharing ministry plans

```text
ALWAYS warn: not insurance, no ACA guarantees, pre-existing exclusions common,
no state DOI oversight, sharing not legally enforceable.
```

## Hard rules

- `[HARD]` Never quote HSA/FSA limits, FPL bands, or subsidy %s from memory — always `webFetch` or use `cobalt.figures.*`.
- `[HARD]` HSA requires HDHP + no other first-dollar coverage. Medicare enrollment (incl. Part A only) ends HSA contribution eligibility.
- `[RULE]` Premium tax credit reconciled on Form 8962 at filing — MAGI swing = repay or refund.
- `[RULE]` SEP windows are short (typically 60 days from qualifying event).
- `[RULE]` Healthsharing ≠ insurance. Always disclose.

## Common mistakes

- Treating HSA like FSA (forgetting it rolls over and invests)
- Contributing to HSA while spouse has general-purpose FSA (disqualifying)
- Missing 60-day SEP after job loss; defaulting to COBRA unexamined
- Ignoring CSR (cost-sharing reduction) — only available on Silver plans below income threshold
- Quoting prior-year FPL when current year applies for coverage year
- Forgetting HSA receipts can be reimbursed years later (paper trail strategy)

## Cross-refs

- `medicare` — age 65+ coverage; HSA contributions stop at Part A enrollment
- `taxes-strategies` — HSA triple-tax-advantage, FSA tax savings
- `retirement` — HSA as stealth retirement account post-65
- `taxes-federal` — Form 8962 PTC reconciliation, itemized medical (Pub 502)

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.hsaLimit({coverage, year, age})` → `{ contributionLimit, catchUp, hdhpMinDeductible, hdhpMaxOOP }`
- `cobalt.figures.fpl({householdSize, year, state})` → `{ fpl, bands: { 138, 150, 200, 250, 400 } }`
- `cobalt.calc.healthcare.acaSubsidy({magi, householdSize, state, year, ageBand})` → `{ ptc, csrEligible, slcspBenchmark, expectedContribution }`
