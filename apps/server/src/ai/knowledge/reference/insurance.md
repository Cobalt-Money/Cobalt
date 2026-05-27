---
id: reference-insurance
title: Insurance — Life, Disability, Liability, Property, LTC
description: Use when user asks about term vs whole life, disability income (own-occ vs any-occ), umbrella liability, homeowners vs renters, auto (liability limits, UM/UIM, deductible), LTC vs self-insure vs hybrid, BOP, professional liability / E&O. Health insurance lives in `healthcare`/`medicare`.
keywords: life insurance, term life, whole life, universal life, IUL, VUL, disability insurance, own-occupation, any-occupation, umbrella, liability, homeowners, renters, auto insurance, UM, UIM, deductible, long-term care, LTC, hybrid LTC, BOP, business owners policy, professional liability, E&O, malpractice
status: partial
jurisdiction: US
last_reviewed: 2026-05-27
sources:
  - name: "Insurance Information Institute (III)"
    url: "https://www.iii.org/"
  - name: "NAIC consumer info"
    url: "https://content.naic.org/consumer/"
  - name: "Consumer Reports insurance"
    url: "https://www.consumerreports.org/insurance/"
  - name: "SOA long-term care research"
    url: "https://www.soa.org/research/research-by-topic/long-term-care/"
---

# Insurance — Life, Disability, Liability, Property, LTC

For figures (typical premium ranges, state minimums, LTC cost benchmarks), `webFetch` sources. Do not paraphrase from memory.

## When to use

- Life insurance need + term vs permanent framing
- Disability income: own-occ vs any-occ, elimination period, benefit period
- Umbrella liability sizing
- Homeowners vs renters; HO-3 vs HO-5; replacement cost vs ACV
- Auto: liability limits, UM/UIM, deductible vs premium tradeoff
- LTC: self-insure vs traditional LTC vs hybrid life/LTC
- BOP / professional liability / E&O for small biz, contractors, professionals

## Required inputs (ASK if missing)

- Age + dependents + income (for life/DI need)
- Net worth + state (for umbrella + auto liability minimums)
- Occupation + income reliance (for DI; own-occ matters more for specialists)
- Existing employer group coverage (life, DI, LTD)
- Assets at risk + state homestead exemption (for liability sizing)
- Home value + replacement cost estimate (not market value)
- For LTC: age, health, family longevity, liquid net worth

## STOP — refer to specialist

- Specific carrier picks, underwriting class shopping → independent broker (not captive)
- Claim disputes / bad faith → consumer attorney + state DOI complaint
- Captive insurance / 831(b) strategies → tax attorney + actuary
- ILITs / second-to-die for estate liquidity → estate attorney + CPA
- Annuity-funded LTC riders (7702/7702B) → fee-only fiduciary

Respond: "Needs a licensed independent broker — can explain the concept but not your number."

## Workflow

1. Identify which risk (premature death / disability / liability / property / longevity-care).
2. Collect inputs above.
3. Surface employer baseline first (group life, group LTD) before recommending individual.
4. For life: need = income replacement + debts + education + final expenses − liquid assets − existing coverage. Default to term unless estate-tax / business / special-needs reason.
5. For DI: own-occ for specialists/professionals; check definition shift after 24mo; cap typically 60–70% income.
6. For umbrella: size to net worth + future earnings; confirm underlying liability limits meet umbrella's required floor.
7. For LTC: self-insure threshold typically high liquid net worth; hybrid avoids "use it or lose it" objection.
8. Disclaimer: educational; product details + carrier ratings matter.

### Current status: partial

- Life need calc: planned
- DI need calc: planned
- Umbrella sizing rules of thumb: planned

## Decision: term vs permanent life

```text
IF temporary need (kids dependent, mortgage, working years) → term (cheapest, simplest)
ELSE IF estate liquidity, special-needs dependent, business buyout → permanent (whole/UL)
ELSE IF pitched IUL/VUL "as investment" → almost always wrong tool; prefer term + invest difference
```

## Decision: own-occ vs any-occ disability

```text
IF specialty profession (surgeon, dentist, attorney) → true own-occ worth premium
ELSE IF general role + employer LTD adequate → group + small supplement may suffice
NOTE: "modified own-occ" shifts to any-occ after 24mo — read definition
```

## Decision: umbrella sizing

```text
size ≥ net worth + present value of future earnings
floor at $1M; raise with rental properties, teen drivers, pool, dog, board seats
verify underlying auto/home liability meets umbrella minimums (else gap)
```

## Decision: LTC — self-insure / traditional / hybrid

```text
IF liquid net worth high (well above projected LTC cost) → self-insure
ELSE IF moderate assets + insurable health → hybrid life/LTC (no use-it-or-lose-it)
ELSE IF strict budget + early planning → traditional LTC (watch premium hikes)
```

For depth: `webFetch` SOA LTC research.

## Decision: HO-3 vs HO-5 + endorsements

```text
IF higher-value home, want open-perils on contents → HO-5
ELSE → HO-3 (named perils on contents)
ADD: water backup, ordinance/law, scheduled jewelry/art if applicable
INSURE TO replacement cost, not market value or mortgage balance
```

## Hard rules

- `[HARD]` Never quote premium figures, state minimums, or LTC cost benchmarks from memory — `webFetch`.
- `[HARD]` Never recommend specific carrier or policy — route to independent broker.
- `[RULE]` Permanent life "as investment" is almost always wrong absent specific need (estate liquidity, special needs, business). Default term.
- `[RULE]` Group LTD is usually any-occ + taxable benefits if employer-paid. Individual own-occ benefits tax-free if employee-paid.
- `[RULE]` Replacement cost ≠ market value ≠ mortgage balance. Confirm dwelling coverage basis.
- `[RULE]` Umbrella requires underlying limits to attach — common gap.

## Common mistakes

- Buying whole life on kids "for the cash value"
- Skipping DI because "employer has it" without reading any-occ shift
- Insuring home to mortgage balance, not replacement cost
- Choosing $25K/$50K auto liability with $1M net worth (sue-bait)
- No UM/UIM in state with high uninsured driver rate
- Skipping umbrella with rentals, teen drivers, pool, dog
- Buying LTC at wrong age (too young = pay forever; too old = uninsurable)
- Mistaking life-with-LTC-rider for true LTC coverage (read accelerated benefit terms)

## Cross-refs

- `estate-planning` — ILIT for estate-tax liquidity; second-to-die policies
- `investing-budgeting` — premium fit in cash-flow plan
- `real-estate` — homeowners coverage, landlord policies
- `healthcare` — medical insurance lives there, not here
- `taxes-strategies` — life proceeds income-tax-free; LTC benefit tax treatment

## Function dependencies (future, tracked in Linear)

- `cobalt.calc.insurance.lifeInsuranceNeed({income, yearsToReplace, debts, education, finalExpenses, liquidAssets, existingCoverage})` → `{ need, gap }`
- `cobalt.calc.insurance.disabilityCoverageNeed({income, fixedExpenses, employerLTD, elimPeriod, replacementTarget})` → `{ need, gap, suggestedBenefit }`
