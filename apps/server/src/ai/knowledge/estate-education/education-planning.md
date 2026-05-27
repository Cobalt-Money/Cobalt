---
id: education-planning
title: Education Planning
description: Use when user asks about 529, Coverdell, UGMA/UTMA, savings bonds for college, AOTC/LLC credits, student loan interest deduction, FAFSA strategy, 529→Roth rollover. Concept and account selection only.
keywords: 529, 529 plan, Coverdell, ESA, UGMA, UTMA, custodial, savings bond, EE bond, I bond, AOTC, American Opportunity, Lifetime Learning Credit, LLC, student loan interest, FAFSA, EFC, SAI, SECURE 2.0, 529 to Roth, college, education
status: partial
jurisdiction: US-federal (credits, federal tax) + US-state (529 deduction)
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 970 (Tax Benefits for Education)"
    url: "https://www.irs.gov/forms-pubs/about-publication-970"
  - name: "SavingForCollege.com (529 comparison)"
    url: "https://www.savingforcollege.com/"
  - name: "Federal Student Aid (FAFSA)"
    url: "https://studentaid.gov/h/apply-for-aid/fafsa"
  - name: "SEC: Introduction to 529 Plans"
    url: "https://www.sec.gov/about/reports-publications/investor-publications/introduction-529-plans"
---

# Education Planning

For current credit amounts, phase-outs, K-12 caps, and 529→Roth rollover limits, `webFetch` IRS Pub 970 and SavingForCollege. Do not paraphrase figures from memory.

## When to use

- User asks how to save for kid/grandkid college
- Choosing between 529, Coverdell ESA, UGMA/UTMA, taxable
- State-tax deduction question for 529 contributions
- FAFSA strategy: where to hold assets (parent vs grandparent vs student)
- Education tax credits at filing time (AOTC, LLC)
- Student loan interest deduction
- 529 with leftover funds — beneficiary change, Roth rollover (SECURE 2.0)
- Savings bonds (EE/I) used for education exclusion

## Required inputs (ASK if missing)

- State of residence (529 state deduction varies; some states have recapture)
- Beneficiary age + years to enrollment
- Account owner: parent, grandparent, student
- Other accounts already open
- Approx. income bracket (credits phase out)
- K-12 use planned or college only

## STOP — refer to specialist

- Divorce decrees specifying college funding — refer to family-law attorney
- FAFSA verification disputes — school financial aid office
- Graduate-level financial aid optimization (PLUS, GradPLUS, REPAYE/SAVE specifics)
- International / foreign-school 529 use edge cases
- State-specific 529 deduction recapture on nonqualified withdrawals (state CPA)
- Special-needs ABLE-account vs 529 coordination (specialist)

Respond: "Needs a tax pro or financial aid office — can explain the concept but not your number."

## Workflow

1. Clarify goal: tax-favored savings vs. immediate-year tax credit vs. FAFSA optimization.
2. Account selection — see decision tree below.
3. For state-tax deduction: `webFetch` SavingForCollege state map. Most states require using THAT state's plan.
4. Beneficiary change rules — 529 beneficiary can change to family member (broadly defined) with no tax.
5. FAFSA impact:
   - Parent-owned 529 → counted as parent asset (low impact)
   - Grandparent-owned 529 → no longer counted as student income under FAFSA Simplification Act; verify current rules via `studentaid.gov`
   - UGMA/UTMA → student asset (high impact on aid)
6. At filing time: AOTC vs LLC — can't double-dip on same expenses. AOTC better for first 4 yrs undergrad if eligible. `webFetch` IRS Pub 970 for current phase-outs. Reference `cobalt.figures.educationCredits({year})` when wired.
7. Leftover 529: change beneficiary OR (SECURE 2.0) rollover to Roth IRA for beneficiary — strict conditions: 15-yr account age, rollover lifetime cap, contributions within last 5 yrs excluded, subject to annual Roth contribution limit. Verify via IRS.
8. Disclaimer: rules change; verify current limits via source URLs before acting.

### Current status: partial

- Account selection + concept guidance wired
- `cobalt.figures.educationCredits` / `savingsBondsExclusion` NOT yet wired — `webFetch` IRS for now
- No state 529 deduction table — `webFetch` SavingForCollege
- No college-cost projection — `cobalt.calc.tvm.fv` exists generically

## Decision: account selection

```text
IF goal = college (and maybe limited K-12) + want tax-free growth + maybe state deduction
  → 529 plan (parent-owned if FAFSA matters)
ELSE IF want broad K-12 + investment flexibility + income under ESA limit
  → Coverdell ESA (small annual cap — verify via IRS)
ELSE IF goal not strictly education + want gift-to-minor + accept FAFSA hit
  → UGMA/UTMA (irrevocable gift, kid controls at majority)
ELSE IF low/mid income + already own EE/I bonds + use for qualified expenses
  → Series EE/I bond education exclusion (income-phased)
ELSE → taxable brokerage
```

For depth: `webFetch` SavingForCollege and IRS Pub 970.

## Decision: AOTC vs LLC

```text
IF first 4 years undergrad + at least half-time + no felony drug conviction + income under phase-out
  → AOTC (partially refundable, per-student)
ELSE IF grad school OR part-time OR beyond 4 yrs OR job-skills course
  → Lifetime Learning Credit (nonrefundable, per-return)
```

## Hard rules

- `[HARD]` Cannot use same expenses for AOTC AND LLC AND tax-free 529 withdrawal. Coordinate.
- `[HARD]` Nonqualified 529 withdrawal: earnings taxed + 10% penalty + possible state deduction recapture.
- `[HARD]` UGMA/UTMA is irrevocable gift to the child. Cannot reclaim.
- `[RULE]` 529 K-12 use capped per beneficiary per year (federal). Some states don't conform — withdrawal may be qualified federally but not for state. `webFetch` state rules.
- `[RULE]` 529→Roth rollover (SECURE 2.0): subject to annual Roth contribution limit, 15-yr account seasoning, 5-yr contribution lookback, lifetime cap. Verify via IRS.
- `[RULE]` Grandparent-owned 529 distribution rules changed under FAFSA Simplification Act — verify current treatment.

## Common mistakes

- Contributing to out-of-state 529 when home state offers deduction only for in-state plan
- Treating UGMA/UTMA as the parent's money (it's the kid's at majority)
- Stacking AOTC with tax-free 529 withdrawal on same tuition $
- Forgetting room/board is qualified for 529 (with limits) but not for AOTC/LLC
- Naming student as 529 owner — hurts FAFSA more than parent-owned
- Assuming 529→Roth rollover is unrestricted (it's tightly capped)
- Withdrawing 529 in different year than expense paid — mismatch creates tax issue

## Cross-refs

- `taxes-federal` — AOTC, LLC, student loan interest deduction
- `taxes-strategies` — 529 funding, superfunding (5-yr gift election)
- `taxes-state` — state 529 deduction, recapture rules
- `investing` — 529 investment menus, age-based glide path
- `retirement` — 529→Roth rollover under SECURE 2.0
- `reference-financial-glossary` — EFC, SAI, AOTC, LLC

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.educationCredits({year})` → `{ aotc: {...}, llc: {...}, phaseOuts: {...} }`
- `cobalt.figures.savingsBondsExclusion({year, status})` → `{ phaseOut: {...} }`
- `cobalt.figures.studentLoanInterest({year, status})` → `{ cap: number, phaseOut: {...} }`
- `cobalt.calc.tvm.fv({pv, pmt, rate, years})` → college-cost projection
