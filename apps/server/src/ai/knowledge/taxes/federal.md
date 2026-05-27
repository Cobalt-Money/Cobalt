---
id: taxes-federal
title: Federal Income Tax
description: Use when user asks about federal income tax owed, marginal vs effective rate, tax brackets, std vs itemized deduction, filing status, or "how much tax on $X". Ordinary income only. Investment income → taxes-capital-gains. Self-employment → taxes-self-employment.
keywords: federal income tax, brackets, marginal, effective, standard deduction, itemized, filing status, AGI, MAGI, taxable income, withholding, 1040, IRS
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 17 (Your Federal Income Tax — comprehensive)"
    url: "https://www.irs.gov/forms-pubs/about-publication-17"
  - name: "IRS Rev. Proc. 2025-32 (2026 inflation adjustments)"
    url: "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf"
  - name: "IRS Rev. Proc. 2024-40 (2025 inflation adjustments)"
    url: "https://www.irs.gov/pub/irs-drop/rp-24-40.pdf"
  - name: "Form 1040 instructions (current year)"
    url: "https://www.irs.gov/forms-pubs/about-form-1040"
  - name: "Withholding Estimator (user-facing)"
    url: "https://www.irs.gov/individuals/tax-withholding-estimator"
  - name: "Tax Foundation 2026 brackets (cross-check)"
    url: "https://taxfoundation.org/data/all/federal/2026-tax-brackets/"
---

# Federal Income Tax

For concept depth or current figures, `webFetch` the source URLs above. Do not paraphrase law from memory.

## When to use

- Tax owed / refund estimate (ordinary income)
- Marginal vs effective rate
- Std vs itemized choice
- Filing status choice
- Impact of raise / bonus / RSU (ordinary portion)

## Required inputs (ASK if missing)

- `filing_status` ∈ `single | mfj | mfs | hoh | qss`
- `year`
- Gross ordinary income (W-2 box 1, interest, ordinary div, retirement distributions). Exclude LTCG + qualified div.
- Above-the-line adjustments (HSA, student loan int, traditional IRA if not in W-2)
- Deduction choice (standard vs itemized). If unsure → ask for itemized total to compare.

W-2 box 1 ≠ AGI ≠ taxable income. Clarify which the user is quoting.

## STOP — refer to CPA

- AMT exposure (large ISO exercise, high SALT, high misc deductions)
- K-1 income (partnership / S-corp / trust)
- Foreign earned income, FEIE, FTC, FATCA
- Multi-state residency / mid-year move
- NOL carryforwards / carrybacks
- Estimated-tax penalty / Form 2210 planning
- Estate / trust 1041
- Audit, amended return, tax debt, OIC

Respond: "Needs a licensed CPA — can explain the concept but not your number."

## Workflow

1. Gather **Required inputs**; ASK if missing.
2. Check **STOP** list.
3. (when wired) `cobalt.figures.taxBrackets({year, status})`
4. (when wired) `cobalt.figures.standardDeduction({year, status, age65?, blind?})`
5. `taxable = max(0, AGI − deduction − QBI)`
6. (when wired) `cobalt.tax.federalIncome({year, status, taxableIncome})` → `{ tax, marginalRate, effectiveRate, breakdown, _meta }`
7. Surface `_meta.source` citation.
8. Disclaimer: "Estimate only — not tax advice."

### Current status: partial

`cobalt.tax.*` and `cobalt.figures.*` not yet wired. For numbers, point user at IRS Withholding Estimator (sources block) or CPA. Explain methodology qualitatively if asked.

## Decision: std vs itemize

```
IF MFS AND spouse itemizes → must itemize
ELSE IF (mortgage interest + SALT(capped) + charity + medical>7.5%AGI) > standard
  → itemize
ELSE → standard
```

For depth: `webFetch` IRS Pub 17 §12 (Itemized Deductions).

## Decision: filing status

```
unmarried
  IF supporting qualifying dependent >½ year AND paid >½ household cost → HOH
  ELSE → single
married Dec 31
  → MFJ default (MFS only for narrow cases: large medical, IDR student loans, separation)
spouse died ≤2y AND have dependent child → QSS
```

For depth: `webFetch` IRS Pub 501.

## Hard rules

- `[HARD]` Brackets are marginal — only income above each threshold taxed at next rate.
- `[HARD]` LTCG + qualified div use a separate schedule — never apply ordinary brackets to them.
- `[HARD]` SALT itemized cap = $10k (TCJA; verify current year via `cobalt.figures.*` or webFetch Pub 17).
- `[HARD]` Std deduction varies by status + age (65+) + blindness.
- `[RULE]` ~90% of filers take std deduction post-TCJA.
- `[RULE]` Effective rate ≈ 50–75% of marginal for typical wage earners.

## Common mistakes

- Quoting bracket w/o filing status
- Conflating gross / AGI / taxable
- Marginal vs effective swap
- Treating bonuses as taxed at a higher rate (only withholding differs)
- Applying ordinary brackets to LTCG / qual div

## Cross-refs

- `taxes-capital-gains` — LTCG, qualified div, NIIT
- `taxes-state` — stacks on federal
- `taxes-self-employment` — SE tax, Schedule C
- `taxes-strategies` — Roth conversion, harvesting, bunching
- `taxes-life-events` — marriage, divorce, new child, job change
- `retirement` — pre-tax vs Roth bracket logic
- `reference-financial-glossary` — AGI / MAGI / marginal vs effective definitions

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.taxBrackets({year, status})`
- `cobalt.figures.standardDeduction({year, status, age65?, blind?})`
- `cobalt.tax.federalIncome({year, status, taxableIncome})` → `{tax, marginalRate, effectiveRate, breakdown, _meta}`
- `cobalt.tax.amt(...)` — likely STOP-gate only for v1
