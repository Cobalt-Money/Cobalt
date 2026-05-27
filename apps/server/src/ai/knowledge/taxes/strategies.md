---
id: taxes-strategies
title: Tax Strategies
description: Use when user asks about Roth conversion, backdoor Roth, mega backdoor, tax-loss harvesting, asset location, bunching / DAF, HSA triple-tax, Roth ladder, 0% LTCG harvest, QCD, §83(b) election. Aggressive shelters (life insurance arbitrage, captive insurance, syndicated easements, trust shelters) → STOP.
keywords: roth conversion, backdoor roth, mega backdoor, tax loss harvesting, TLH, asset location, bunching, DAF, donor advised fund, HSA, roth ladder, 0% LTCG, QCD, 83(b), qualified charitable distribution
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "Kitces — tax planning archive"
    url: "https://www.kitces.com/blog/category/taxes/"
  - name: "IRS Pub 590-A (IRA Contributions)"
    url: "https://www.irs.gov/forms-pubs/about-publication-590-a"
  - name: "IRS Pub 590-B (IRA Distributions)"
    url: "https://www.irs.gov/forms-pubs/about-publication-590-b"
  - name: "IRS QCD / IRA distribution FAQs"
    url: "https://www.irs.gov/retirement-plans/retirement-plans-faqs-regarding-iras-distributions-withdrawals"
  - name: "Bogleheads — Tax Loss Harvesting"
    url: "https://www.bogleheads.org/wiki/Tax_loss_harvesting"
---

# Tax Strategies

For concept depth or current figures, `webFetch` the source URLs above. Do not paraphrase law from memory.

## When to use

- Roth conversion or Roth ladder
- Backdoor Roth / mega backdoor (after-tax 401k → Roth)
- Tax-loss harvesting (TLH)
- Asset location (which account holds what)
- Bunching itemized deductions / DAF
- HSA "triple tax advantage" maximizing
- 0% LTCG bracket harvesting
- QCD from IRA at RMD age
- §83(b) election on early-exercise / restricted stock

## Required inputs (ASK if missing)

- `filing_status` + `year`
- Current marginal bracket + LTCG bracket
- Account inventory (Trad / Roth / 401k / HSA / taxable)
- Pro-rata IRA balance (matters for backdoor Roth)
- Plan's after-tax + in-plan Roth conversion support (mega backdoor)
- Charitable giving cadence + appreciated asset availability
- Time horizon to withdrawal

## STOP — refer to CPA / CFP

- Captive insurance, §831(b) micro-captive
- Syndicated conservation easements
- Life-insurance based arbitrage (IUL, premium financing)
- Charitable remainder / lead trusts (CRT / CLT)
- §1031 → §721 UPREIT
- §1202 QSBS stacking / non-grantor trust gifting
- Anything marketed as "tax shelter" / "loophole"
- §83(b) on illiquid private equity w/o liquidity plan

Respond: "Needs a licensed CFP, CPA, or estate attorney — can explain the concept but not your number."

## Workflow

1. Identify which strategy candidate(s) from user's situation.
2. Check **STOP** list — kill aggressive shelters.
3. Confirm preconditions (e.g., backdoor needs zero pre-tax IRA balance OR willingness to roll into 401(k)).
4. Compute marginal-bracket impact: (when wired) `cobalt.tax.federalIncome` for bracket fill.
5. For Roth conv breakeven: `cobalt.calc.tvm.fv` projection w/ vs w/o conv.
6. Surface trade-offs in plain language (tax now vs tax later).
7. Disclaimer: "Concept-level only — model your actual situation w/ CPA / CFP."

### Current status: partial

`cobalt.calc.retirement.rothConversionBreakeven` not yet wired. Use `cobalt.calc.tvm.fv` for rough projection. Cite Kitces / Bogleheads for mechanics depth.

## Decision: Roth conversion

```
IF current marginal rate < expected retirement marginal rate → convert (now cheaper)
IF in a low-income year (sabbatical, early retire, gap before SS/RMD) → convert (bracket fill)
IF will be in IRMAA / ACA subsidy cliff → model carefully, may avoid
IF no taxable cash to pay conversion tax → usually skip (paying tax from IRA destroys benefit)
ELSE → typically defer
```

For depth: `webFetch` Kitces Roth conversion archive.

## Decision: backdoor Roth (pro-rata trap)

```
IF any pre-tax IRA balance (Trad / SEP / SIMPLE) on Dec 31
  → pro-rata applies — most of conversion is taxable
  → either: (a) roll pre-tax IRA into employer 401(k) first, OR (b) skip strategy
IF zero pre-tax IRA balance → contribute non-ded Trad IRA → convert next day → clean
```

For depth: `webFetch` IRS Pub 590-A + Kitces.

## Decision: asset location

```
tax-inefficient (REITs, bonds, active funds w/ high turnover) → Trad 401(k) / IRA
tax-efficient (broad index ETFs, muni bonds) → taxable
high-growth long-horizon (small-cap, intl small-value, crypto) → Roth
HSA → invest aggressively; reimburse decades later (keep receipts)
```

For depth: `webFetch` Bogleheads asset location wiki.

## Hard rules

- `[HARD]` Backdoor Roth: pro-rata aggregates ALL pre-tax IRA balances across institutions (SEP + SIMPLE + Trad). Solo Roth 401(k) NOT counted.
- `[HARD]` TLH wash sale: 30 days before AND after, across spouse + IRA. Substantially identical = same ticker (mutual fund swap to different index = generally OK; CPA gate for edge cases).
- `[HARD]` Roth 5-yr rule: separate clock for each conversion before age 59½ for penalty-free withdrawal.
- `[HARD]` HSA: triple-tax only if used for qualified medical. Non-medical withdraw pre-65 = income tax + 20% penalty.
- `[HARD]` §83(b) election must be filed within 30 days of grant — no extensions.
- `[HARD]` QCD: must be ≥70½, direct trustee-to-charity transfer, satisfies RMD, excluded from AGI.
- `[RULE]` Convert Roth in Dec → know full year's income.
- `[RULE]` TLH partner pairs: VTI ↔ ITOT, VTSAX ↔ FZROX (verify not "substantially identical").

## Common mistakes

- Backdoor Roth w/ existing pre-tax IRA → pro-rata surprise
- Converting in high-income year (paying top marginal rate unnecessarily)
- TLH then rebuying within 30 days in spouse/IRA
- HSA used for non-medical (loses tax-free growth)
- DAF funding w/ cash instead of appreciated stock (wastes gain avoidance)
- Missing §83(b) 30-day window
- QCD via personal check from IRA (not direct transfer → disqualified)
- Roth conversion w/o accounting for IRMAA / ACA cliff

## Cross-refs

- `taxes-federal` — bracket fill math
- `taxes-capital-gains` — 0% LTCG harvest, TLH wash sale
- `retirement` — Roth ladder, RMD planning, account types
- `investing` — asset location, lot selection
- `healthcare` — HSA mechanics, IRMAA cliff
- `estate-planning` — Roth as inheritance vehicle, QCD

## Function dependencies (future, tracked in Linear)

- `cobalt.calc.tvm.fv({pv, rate, years, contrib})` → Roth breakeven projection
- `cobalt.tax.federalIncome` — bracket fill for conversion sizing
- `cobalt.calc.retirement.rothConversionBreakeven({...})` → future
- `cobalt.calc.tlh.washSaleCheck({lots, candidateBuy, dateWindow})` → future
- `cobalt.figures.iraProRataRatio({preTaxIraBalance, nondedBasis})` — future
