---
id: taxes-life-events
title: Tax Implications of Life Events
description: Use when user mentions marriage, divorce, new baby/dependent, job change, layoff, inheritance, moving states mid-year, retirement, ISOs vesting, disability, death of spouse. Mechanics of underlying taxes → taxes-federal / capital-gains / state. Decree allocation, complex inheritance basis, multi-state mid-year → STOP.
keywords: marriage, divorce, baby, dependent, job change, layoff, severance, inheritance, step-up basis, moving states, retirement, ISO, AMT, disability, widow, QSS, survivors
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 501 (Dependents, Std Deduction, Filing Info)"
    url: "https://www.irs.gov/forms-pubs/about-publication-501"
  - name: "IRS Pub 504 (Divorced or Separated Individuals)"
    url: "https://www.irs.gov/forms-pubs/about-publication-504"
  - name: "IRS Pub 559 (Survivors, Executors, Administrators)"
    url: "https://www.irs.gov/forms-pubs/about-publication-559"
  - name: "SSA Survivors Benefits"
    url: "https://www.ssa.gov/benefits/survivors/"
---

# Tax Implications of Life Events

For concept depth or current figures, `webFetch` the source URLs above. Do not paraphrase law from memory.

## When to use

- Getting married / divorced this year
- New baby, adopted, or dependent parent
- Job change, layoff, severance, RSU acceleration
- Inherited account / property
- Moving between states mid-year
- Retiring (transition year planning)
- ISO exercised or about to vest → AMT preview
- Spouse died → filing status path

## Required inputs (ASK if missing)

- Event + exact date
- Prior + new filing status candidates
- Affected income items (W-2 box 1, severance, RSU vest, inherited IRA)
- Dependent: age, residency, support, relationship
- For move: old state + new state + date

## STOP — refer to CPA / attorney

- Divorce decree allocation of credits / dependents
- Alimony pre-2019 (deductible) vs post (not) edge cases
- Inherited IRA SECURE Act 10-yr rule planning
- Complex basis on inherited real estate / business
- Multi-state mid-year resident allocation
- ISO + AMT planning (use CPA + ISO calculator)
- Trust as beneficiary
- Estate tax filing (Form 706)

Respond: "Needs a licensed CPA or estate attorney — can explain the concept but not your number."

## Workflow

1. Identify event + date → which tax year(s) affected.
2. Check **STOP** list.
3. Map event → tax surface (status, dependents, basis, withholding, state).
4. Pull current-year figures via `webFetch` of sources above (or `cobalt.figures.*` when wired).
5. Flag withholding adjustment (Form W-4) if status/dep change mid-year.
6. Disclaimer: "Estimate only — not tax advice."

### Current status: partial

No event-specific calculator wired. Use as branching map → hand off to `taxes-federal` / `taxes-capital-gains` / `taxes-state` for the actual number.

## Decision: filing status after event

```
married on Dec 31 → MFJ (default) or MFS
divorced/separated by Dec 31 (decree final) → single OR HOH if qualifying dep + >½ household
spouse died THIS year → MFJ for year of death
spouse died IN prior 2y AND have qualifying dep child → QSS
ELSE single
```

For depth: `webFetch` IRS Pub 501.

## Decision: inheritance basis

```
inherited security/property → step-up to FMV at date of death (or alt valuation +6mo)
inherited Traditional IRA → ordinary income on withdraw; SECURE Act 10-yr drain (most non-spouse beneficiaries)
inherited Roth IRA → tax-free on qualified withdraw; still 10-yr drain
spouse beneficiary → can treat as own IRA
```

For depth: `webFetch` IRS Pub 559.

## Hard rules

- `[HARD]` Marital status determined on Dec 31 of the tax year.
- `[HARD]` Inherited step-up applies to non-retirement assets only — NOT to IRA / 401(k).
- `[HARD]` Severance + bonus = ordinary wage income, supplemental withholding ≠ final tax.
- `[HARD]` Mid-year move: file part-year resident in BOTH states unless reciprocity applies.
- `[HARD]` ISO exercise = AMT preference item even w/o sale. Walk through AMT exposure before exercising.
- `[RULE]` Re-run Form W-4 after marriage, divorce, new dep, job change.
- `[RULE]` Layoff in Q4 → may drop bracket; consider Roth conversion in same year.

## Common mistakes

- Assuming MFS saves money (rarely does; loses many credits)
- Forgetting HOH eligibility after divorce
- Treating inherited IRA like inherited stock (no step-up)
- Missing 10-yr drain rule on non-spouse inherited IRA
- Not updating W-4 → big April surprise
- Claiming dependent both parents claim post-divorce (tiebreaker rules)
- Assuming severance avoids FICA (it doesn't)

## Cross-refs

- `taxes-federal` — bracket impact of status change
- `taxes-state` — moving states mid-year, residency
- `taxes-capital-gains` — inherited basis step-up, home sale on divorce
- `retirement` — inherited IRA, severance + 401(k) rollover
- `estate-planning` — beneficiary designations, step-up, 706
- `reference-insurance` — life event → enroll/change coverage windows

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.standardDeduction({year, status, age65?, blind?})`
- `cobalt.figures.dependentCreditPhaseout({year, status})`
- `cobalt.tax.federalIncome` (re-run for new status)
- `cobalt.tax.withholdingAdjust({event, w4})` — future
