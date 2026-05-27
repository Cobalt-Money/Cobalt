---
id: estate-planning
title: Estate Planning
description: Use when user asks about wills, trusts, probate, beneficiaries, estate/gift tax, POA, advance directive, inheritance, step-up basis. Concept-level only; drafting and contested matters out of scope.
keywords: will, trust, revocable living trust, probate, beneficiary, TOD, POD, estate tax, gift tax, GST, portability, POA, power of attorney, advance directive, living will, executor, trustee, step-up basis, ILIT, SLAT, inheritance
status: partial
jurisdiction: US-federal (estate/gift tax) + US-state (probate)
last_reviewed: 2026-05-27
sources:
  - name: "IRS Estate Tax"
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax"
  - name: "IRS Gift Tax"
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/gift-tax"
  - name: "IRS Form 706 (estate)"
    url: "https://www.irs.gov/forms-pubs/about-form-706"
  - name: "IRS Form 709 (gift)"
    url: "https://www.irs.gov/forms-pubs/about-form-709"
  - name: "Uniform Law Commission (state probate codes)"
    url: "https://www.uniformlaws.org/"
  - name: "AARP estate planning guide"
    url: "https://www.aarp.org/money/investing/info-2020/estate-planning-guide.html"
  - name: "NAELA (elder law attorneys)"
    url: "https://www.naela.org/"
---

# Estate Planning

For concept depth or current figures (exemption, annual exclusion, GST), `webFetch` the source URLs above. Do not paraphrase law/figures from memory.

## When to use

- User mentions will, trust, probate, "what happens when I die"
- Naming/updating beneficiaries on retirement, life insurance, TOD/POD accounts
- Marriage, divorce, birth, death — beneficiary review trigger
- Inheritance received — basis questions, inherited IRA rules
- Gifting to kids/grandkids; lifetime exemption questions
- Naming POA, healthcare proxy, advance directive
- Digital asset planning (passwords, crypto, cloud accounts)

## Required inputs (ASK if missing)

- State of residence (probate is state law)
- Marital status; citizenship of spouse (nonresident spouse = different rules)
- Approx. net worth bracket (under/near/over federal exemption?)
- Existing docs: will, trust, POA, healthcare directive, beneficiary forms
- Minor children? Special-needs dependents?
- Business ownership, out-of-state real estate

## STOP — refer to estate attorney

- Drafting trust language or will provisions
- ILIT / SLAT / GRAT / CRT / QPRT structures (tax-driven trusts)
- Contested wills, will challenges, undue influence claims
- Multi-state probate (ancillary probate for out-of-state real estate)
- International estate: foreign property, nonresident/non-citizen spouse, expatriation
- Charitable remainder trusts beyond intro
- Asset-protection trust selection (DAPT, offshore)

Respond: "Needs a licensed estate attorney — can explain the concept but not draft or strategize your specific structure."

## Workflow

1. Identify trigger: planning from scratch vs. life event vs. inheritance received.
2. Pull existing docs inventory (ask user). Flag what's missing.
3. Beneficiary audit FIRST — beneficiary designations override the will. Retirement, life insurance, TOD/POD, HSA.
4. Probate-avoidance checklist: titling (JTWROS, TBE), TOD/POD, revocable living trust, beneficiary designations.
5. For estate/gift tax: `webFetch` IRS Estate Tax and Gift Tax pages for current exemption + annual exclusion. Reference `cobalt.figures.estateExemption({year})` / `cobalt.figures.giftAnnualExclusion({year})` when wired.
6. Portability (DSUE) — surviving spouse must file Form 706 to elect, even if no tax due.
7. Step-up basis at death — inherited appreciated assets reset to FMV at date of death. Critical for capital gains planning. See `taxes-capital-gains`.
8. Incapacity planning: financial POA + healthcare proxy + advance directive. Separate from death planning.
9. Disclaimer: concept-level only; final docs require attorney in user's state.

### Current status: partial

- Concept guidance wired
- `cobalt.figures.estateExemption` / `giftAnnualExclusion` NOT yet wired — `webFetch` IRS for now
- No state-specific probate threshold data
- No ILIT/SLAT modeling

## Decision: will vs revocable living trust

```
IF estate small + simple + no real estate in multiple states + privacy not concern
  → will + beneficiary designations + TOD/POD likely sufficient
ELSE IF real estate in 2+ states OR privacy matters OR incapacity planning priority OR blended family
  → revocable living trust (plus pour-over will) likely warranted
ELSE → discuss tradeoffs with attorney
```

For depth: `webFetch` AARP estate planning guide.

## Decision: beneficiary designation conflict

```
IF account has named beneficiary (retirement, life insurance, TOD/POD)
  → beneficiary form CONTROLS, will is ignored for that asset
ELSE → asset goes through probate per will (or intestacy if no will)
```

## Hard rules

- `[HARD]` Beneficiary designations override the will. Always audit after marriage/divorce/death.
- `[HARD]` Do not draft trust or will language. Refer to attorney.
- `[HARD]` Portability (DSUE) requires timely Form 706 filing by surviving spouse — flag, don't compute.
- `[RULE]` Step-up basis applies to assets in decedent's estate; does NOT apply to retirement accounts (IRAs/401k).
- `[RULE]` Annual gift exclusion is per-donor, per-donee, per-year. Above that → file Form 709, uses lifetime exemption.
- `[RULE]` Joint tenancy with non-spouse can trigger gift tax + lose step-up. Flag.
- `[RULE]` Digital assets need explicit authorization (RUFADAA) — passwords alone insufficient.

## Common mistakes

- Forgetting to update beneficiaries after divorce — ex still inherits
- Naming minor as direct beneficiary — court-supervised guardianship triggered
- Naming "estate" as IRA beneficiary — loses stretch and forces probate
- Funding a revocable trust on paper but never retitling assets
- Assuming will covers retirement accounts (it doesn't)
- DIY will across state lines (witnessing/notarization rules vary)
- Holding low-basis assets jointly with kids (loses half the step-up)

## Cross-refs

- `taxes-life-events` — death of spouse, inheritance, filing status changes
- `reference-insurance` — life insurance ownership, ILIT considerations
- `retirement` — beneficiary designations, inherited IRA (10-year rule)
- `taxes-capital-gains` — step-up basis at death
- `reference-financial-glossary` — DSUE, GST, portability, step-up

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.estateExemption({year})` → `{ individual: number, married: number, portability: boolean }`
- `cobalt.figures.giftAnnualExclusion({year})` → `{ perDonee: number, nonCitizenSpouse: number }`
- `cobalt.figures.gstExemption({year})` → `{ amount: number }`
- `cobalt.calc.estate.exemptionRemaining({lifetimeGifts, year})` → `{ remaining: number, dsueAvailable: number }`
