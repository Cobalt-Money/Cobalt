---
id: taxes-state
title: State Income Tax
description: Use when user asks about state income tax owed, residency, reciprocity, state conformity to federal AGI/itemized, state-specific credits, LLC franchise taxes, city/local (NYC, SF, Philly). Federal mechanics → taxes-federal. Multi-state allocation, convenience-of-employer (NY/CT/PA/NJ/DE), expat residency → STOP.
keywords: state income tax, residency, domicile, reciprocity, conformity, franchise tax, NYC, SF, Philly, local tax, FTB, DTF, part-year resident, nonresident
status: partial
jurisdiction: US-state
last_reviewed: 2026-05-27
sources:
  - name: "Tax Foundation — State Tax Maps & Data"
    url: "https://taxfoundation.org/data/state-tax/"
  - name: "Federation of Tax Administrators (state DOR directory)"
    url: "https://www.taxadmin.org/state-tax-agencies"
  - name: "California Franchise Tax Board"
    url: "https://www.ftb.ca.gov/"
  - name: "New York State Dept of Taxation and Finance"
    url: "https://www.tax.ny.gov/"
---

# State Income Tax

For concept depth or current figures, `webFetch` the source URLs above. Do not paraphrase law from memory.

## When to use

- State income tax owed estimate
- Residency / domicile question
- Reciprocity between border states
- State's treatment of federal AGI / itemized (conformity)
- State-specific credits (renter, child, EITC piggyback)
- LLC franchise / annual tax (CA $800, DE, TX margin)
- City / local tax (NYC, Yonkers, SF gross receipts, Philly wage)

## Required inputs (ASK if missing)

- State(s) of residence + domicile
- `year`
- `filing_status` (state status may differ from federal)
- Federal AGI + federal taxable income
- Itemized vs std (state often piggybacks federal choice)
- Days physically present in each state (residency test)
- W-2 source state(s) (where work performed)

## STOP — refer to CPA

- Multi-state allocation / apportionment of business income
- Telecommuter "convenience of employer" (NY, CT, PA, NJ, DE) — taxed by employer's state regardless of where work done
- Expat / foreign domicile state residency exit
- Part-year + nonresident combo
- State-specific PTET (pass-through entity tax) elections
- State conformity decoupling (e.g., bonus depreciation, §199A)

Respond: "Needs a licensed CPA — can explain the concept but not your number."

## Workflow

1. Determine residency: domicile + statutory (days-present) test.
2. Gather **Required inputs**; ASK if missing.
3. Check **STOP** list (esp. convenience-of-employer states).
4. Start from federal AGI → apply state additions / subtractions per state form.
5. Apply state std/itemized (may differ from federal).
6. (when wired, top 10 states) `cobalt.tax.stateIncome({state, year, status, stateTaxableIncome})`.
7. Add city/local where applicable.
8. Disclaimer: "Estimate only — not tax advice."

### Current status: partial

`cobalt.tax.stateIncome` v1 = top 10 states only (CA, NY, TX, FL, IL, PA, OH, GA, NC, NJ). Others → `webFetch` state DOR directly.

## Decision: residency

```
domicile = where you intend to make permanent home (one state only)
statutory resident
  IF >183 days physical presence AND permanent place of abode in state → resident
  ELSE → nonresident or part-year
moved mid-year → part-year resident in both states; allocate income by source/dates
no income tax states (verify current): AK, FL, NV, NH, SD, TN, TX, WA, WY
```

For depth: `webFetch` state DOR (sources above) or Tax Foundation.

## Decision: conformity

```
"rolling" conformity (auto-follow IRC) → most state changes track federal
"static" conformity (snapshot date) → may decouple from recent fed changes
common decouplings: bonus depreciation, §199A QBI, SALT cap workaround (PTET)
```

For depth: `webFetch` Tax Foundation conformity tracker + state DOR.

## Hard rules

- `[HARD]` Domicile = exactly one state at a time.
- `[HARD]` Convenience-of-employer (NY/CT/PA/NJ/DE) taxes remote workers as if in employer's state — STOP gate.
- `[HARD]` No-income-tax state still hits via property + sales + sometimes franchise (TX margin, WA B&O, NH on int/div).
- `[HARD]` State residency rules differ from federal — file the state form, not federal.
- `[HARD]` Resident credit for tax paid to another state prevents most double taxation (claim on resident-state return).
- `[RULE]` Moving for tax: clean break (sell house, switch licenses, register to vote, move family) — paper trail matters.
- `[RULE]` Some cities (NYC, Yonkers, Philly, SF) layer atop state — check city return separately.

## Common mistakes

- Assuming W-2 state withholding = correct state of residence
- Ignoring NY convenience-of-employer rule when remote from NJ/CT
- Forgetting CA's $800 LLC annual franchise tax
- Not filing nonresident return where income was sourced (rental, K-1)
- Treating part-year as "round up" — must apportion
- Assuming no-tax states have no tax burden (often higher property / sales)
- Missing local tax (NYC, Philly, SF) atop state

## Cross-refs

- `taxes-federal` — state starts from federal AGI
- `taxes-life-events` — moving states mid-year
- `real-estate` — property tax, transfer tax, state-specific
- `taxes-self-employment` — state SE / LLC franchise / city UBT

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.stateBrackets({state, year, status})` → `{brackets, stdDeduction, _meta}` (top 10 states v1)
- `cobalt.tax.stateIncome({state, year, status, stateTaxableIncome})` → `{tax, marginalRate, effectiveRate, _meta}`
- `cobalt.tax.localIncome({city, year, ...})` — future (NYC, Yonkers, Philly, SF)
- `cobalt.figures.noIncomeTaxStates()` → list (verify against current law)
