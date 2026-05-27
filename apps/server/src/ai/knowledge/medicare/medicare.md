---
id: medicare
title: Medicare Enrollment & Coverage
description: Use when user asks about Medicare Part A/B/C/D, Medigap, IRMAA, MAGI lookback, IEP/GEP/SEP enrollment timing, working past 65 with employer coverage, late enrollment penalties, Medicare Advantage vs Original+Medigap, donut hole / drug coverage gap. Age 65+ (or disability-eligible) only — pre-65 in `healthcare`.
keywords: Medicare, Part A, Part B, Part C, Part D, Medigap, Medicare Advantage, IRMAA, IEP, GEP, SEP, late enrollment penalty, MAGI lookback, donut hole, coverage gap, SHIP, original Medicare
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "Medicare.gov"
    url: "https://www.medicare.gov/"
  - name: "CMS premiums & IRMAA"
    url: "https://www.cms.gov/medicare/payment/medicare-premiums"
  - name: "Medicare & You handbook"
    url: "https://www.medicare.gov/medicare-and-you"
  - name: "SHIP (State Health Insurance Assistance)"
    url: "https://www.shiphelp.org/"
  - name: "Kaiser Medicare resources"
    url: "https://www.kff.org/medicare/"
---

# Medicare Enrollment & Coverage

For figures (Part B premium, IRMAA brackets, penalties, deductibles), `webFetch` sources above. Do not paraphrase from memory.

## When to use

- Turning 65, planning IEP (Initial Enrollment Period)
- Working past 65 — decide whether to delay Part B
- Choosing Original Medicare + Medigap vs Medicare Advantage (Part C)
- Part D drug plan timing; late enrollment penalty exposure
- IRMAA (income-related Part B/D surcharge) projection
- MAGI lookback (typically 2-year) planning — Roth conversion, large cap gain, IRA RMD impact

## Required inputs (ASK if missing)

- Current age + month/year turning 65
- Employer coverage status (active employer with ≥20 employees changes rules)
- Spouse coverage if dependent
- MAGI for relevant lookback year (for IRMAA)
- State (Medigap pricing + SEP rules vary)
- Existing HSA contributions? (Part A enrollment ends HSA eligibility)

## STOP — refer to specialist

- Specific plan picks (Advantage carrier, Medigap letter shopping) → SHIP counselor or independent broker
- Claim disputes / coverage denials → SHIP / Medicare Ombudsman / attorney
- Dual-eligible Medicaid coordination → Medicaid planner / elder-law attorney
- ESRD-based Medicare eligibility (under 65) → SSA + nephrology social worker
- FEHB + Medicare coordination for federal retirees → OPM + federal-benefits specialist

Respond: "Needs a SHIP counselor or licensed broker — can explain the concept but not your plan choice."

## Workflow

1. Determine eligibility window (IEP: 7-month window around 65th birthday; GEP Jan–Mar; SEP for qualifying events).
2. Check employer-coverage delay rules (≥20 employee employer → can delay Part B without penalty; <20 → Medicare primary).
3. Surface Part A enrollment + HSA interaction (`webFetch` Pub 969 cross-ref).
4. IRMAA: collect MAGI for lookback year via `cobalt.figures.irmaaBrackets` (planned); flag appeal path (Form SSA-44) for life-changing events.
5. Original + Medigap vs Advantage: list tradeoffs (network, OOP cap, travel, underwriting at switch).
6. Part D penalty exposure if creditable coverage lapsed >63 days.
7. Disclaimer: educational; confirm with SHIP / SSA.

### Current status: partial

- IRMAA bracket lookup: `cobalt.figures.irmaaBrackets` (planned)
- MAGI lookback projection: future calc fn

## Decision: delay Part B at 65 while working?

```
IF employer has ≥20 employees AND coverage creditable → can delay Part B; 8-month SEP after employment ends
ELSE → enroll at IEP to avoid lifetime 10%/yr Part B penalty
```

For depth: `webFetch` Medicare.gov "Working past 65".

## Decision: Original + Medigap vs Medicare Advantage

```
IF want any provider nationwide, predictable OOP, willing to pay Medigap premium → Original + Medigap + Part D
ELSE IF OK with network, want extras (dental/vision/gym), lower premium → Advantage
NOTE: switching FROM Advantage TO Medigap later may require medical underwriting (state-dependent)
```

For depth: `webFetch` KFF Medicare comparison.

## Decision: IRMAA appeal worth filing?

```
IF life-changing event (retirement, divorce, spouse death, work stoppage, pension loss) → file SSA-44
ELSE IF one-off MAGI spike (Roth conversion, home sale) → cannot appeal; plan ahead next time
```

## Hard rules

- `[HARD]` Never quote IRMAA brackets, Part B premium, or penalty %s from memory — `webFetch` CMS.
- `[HARD]` Enrolling in Part A (even premium-free) ends HSA contribution eligibility. SS benefit claim auto-enrolls in Part A; cannot decline retroactive.
- `[RULE]` IRMAA uses 2-year lookback MAGI. Plan Roth conversions and gain realizations with this in mind.
- `[RULE]` Medigap guaranteed-issue window is narrow (typically 6mo from Part B start). Outside it, carriers may underwrite.
- `[RULE]` Part D late-enrollment penalty is lifetime, based on months without creditable coverage.

## Common mistakes

- Claiming SS at 65 → auto-enrolls Part A → wrecks ongoing HSA contributions
- Assuming COBRA = creditable coverage for Part B/D (it generally isn't for Part B SEP)
- Missing 8-month SEP after employer coverage ends
- Choosing Advantage without checking provider network; locked in until next AEP
- Ignoring IRMAA when planning Roth conversions in early 60s
- Forgetting Part D requirement even if no current Rx — penalty accrues

## Cross-refs

- `healthcare` — pre-65 ACA / HSA; HSA contribution ends at Part A
- `retirement` — SS claiming interaction with Medicare auto-enrollment
- `taxes-federal` — MAGI definition, IRMAA sensitivity, Roth conversion timing
- `taxes-strategies` — Roth conversion + IRMAA planning

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.irmaaBrackets({year, status, part})` → `{ brackets: [{ magiMin, magiMax, partBSurcharge, partDSurcharge }] }`
- `cobalt.calc.healthcare.medicareIRMAA({magiLookback, year, status})` → `{ partBTotal, partDSurcharge, bracket, distanceToNextBracket }`
