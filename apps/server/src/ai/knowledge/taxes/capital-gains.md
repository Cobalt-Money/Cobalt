---
id: taxes-capital-gains
title: Capital Gains & Investment Income Tax
description: Use when user asks about LTCG vs STCG, qualified vs non-qualified dividends, NIIT, wash sale, cost basis, holding period, home sale exclusion (§121), QSBS (§1202), §1244 loss, crypto gains. Ordinary income → taxes-federal. K-1 / 1031 / QOZ / foreign → STOP.
keywords: capital gains, LTCG, STCG, qualified dividend, NIIT, 3.8, wash sale, cost basis, holding period, section 121, home sale, QSBS, 1202, 1244, crypto, basis step-up
status: partial
jurisdiction: US-federal
last_reviewed: 2026-05-27
sources:
  - name: "IRS Pub 550 (Investment Income and Expenses)"
    url: "https://www.irs.gov/forms-pubs/about-publication-550"
  - name: "IRS Topic 409 (Capital Gains and Losses)"
    url: "https://www.irs.gov/taxtopics/tc409"
  - name: "IRS Pub 523 (Selling Your Home)"
    url: "https://www.irs.gov/forms-pubs/about-publication-523"
  - name: "IRC §1091 (wash sale)"
    url: "https://www.law.cornell.edu/uscode/text/26/1091"
  - name: "IRS Rev. Proc. 2025-32 (current LTCG thresholds)"
    url: "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf"
---

# Capital Gains & Investment Income Tax

For concept depth or current figures, `webFetch` the source URLs above. Do not paraphrase law from memory.

## When to use

- Sold stock / ETF / crypto / fund
- Dividend received — qualified vs ordinary
- Sold primary home
- Asked about NIIT (3.8%) surtax
- Wash-sale rule triggered (loss + repurchase ≤30 days)
- Cost basis / lot selection (FIFO vs spec-ID)
- QSBS (§1202) or §1244 small-biz loss

## Required inputs (ASK if missing)

- `filing_status` + `year`
- Asset type (stock / fund / crypto / home / collectible / QSBS)
- Acquisition date + sale date → holding period
- Cost basis (incl. adjustments — reinvested div, ESPP discount, RSU vest)
- Proceeds
- Ordinary taxable income (LTCG rate stacks on top)
- For home: years owned + years used as primary in last 5

## STOP — refer to CPA

- K-1 income (PTP, real-estate fund)
- 1031 like-kind exchange
- Qualified Opportunity Zone (QOZ) deferral / step-up
- Foreign accounts, PFIC, FBAR
- Installment sale / §453
- Mark-to-market trader (§475 election)
- Estate basis disputes / decedent's holding period

Respond: "Needs a licensed CPA — can explain the concept but not your number."

## Workflow

1. Gather **Required inputs**; ASK if missing.
2. Check **STOP** list.
3. Classify: holding > 1 year → LTCG; else STCG (ordinary brackets).
4. (when wired) `cobalt.figures.ltcgBrackets({year, status})`
5. (when wired) `cobalt.tax.ltcg({year, status, ordinaryTaxableIncome, ltcg})` — stacks on ordinary income.
6. Qualified div → same rates as LTCG (when wired) `cobalt.tax.qualifiedDividends`.
7. NIIT: if MAGI > threshold → 3.8% on lesser of (NII, MAGI excess). `cobalt.tax.nii` when wired.
8. Surface `_meta.source` citation.
9. Disclaimer: "Estimate only — not tax advice."

### Current status: partial

`cobalt.tax.*` not yet wired. Walk methodology qualitatively; cite IRS Topic 409 + Pub 550 for current figures. For NIIT thresholds → `webFetch` Rev. Proc. 2025-32.

## Decision: short vs long term

```text
holding_period = sale_date − acquisition_date − 1 day
IF holding_period > 365 days → LTCG (preferential rates + NIIT)
ELSE → STCG (ordinary brackets + NIIT)
collectibles (art, metals) → up to 28% LTCG cap
§1250 unrecap depreciation → up to 25%
```

For depth: `webFetch` IRS Topic 409.

## Decision: home sale §121

```text
IF owned ≥2 of last 5y AND used as primary ≥2 of last 5y AND no §121 in prior 2y
  → exclude single/MFJ cap of gain
ELSE → partial exclusion only if move from job/health/unforeseen
```

For depth: `webFetch` IRS Pub 523.

## Hard rules

- `[HARD]` LTCG rates stack on top of ordinary income — fill ordinary brackets first.
- `[HARD]` Wash sale: loss disallowed if substantially identical security bought 30d before/after; basis adjusts on replacement.
- `[HARD]` Wash-sale rule applies across spouse + IRA accounts.
- `[HARD]` Crypto = property (Notice 2014-21). Every disposition taxable. Wash-sale does NOT currently apply to crypto (pending legislation — verify).
- `[HARD]` Net capital loss offset against ordinary income is capped per year; rest carries forward indefinitely.
- `[RULE]` 0% LTCG bracket exists — harvest gains when ordinary income low (sabbatical, early retire).
- `[RULE]` Specific-ID lot selection > FIFO for tax control; must elect at sale.

## Common mistakes

- Applying ordinary brackets to LTCG / qualified div
- Forgetting NIIT on top of LTCG
- Ignoring wash sale across IRA / spouse account
- Using purchase price as basis on RSU (vest-date FMV is basis)
- Treating ESPP discount as basis (it's ordinary income added to W-2, then basis)
- Counting holding period from trade date wrong (day after acq → day of sale)
- Assuming crypto-to-crypto swap is non-taxable

## Cross-refs

- `taxes-federal` — ordinary brackets stack under LTCG
- `taxes-strategies` — tax-loss harvesting, 0% LTCG harvest, asset location
- `investing` — lot selection, account placement
- `investing-equity-compensation` — RSU / ESPP / ISO basis mechanics

## Function dependencies (future, tracked in Linear)

- `cobalt.figures.ltcgBrackets({year, status})` → `{0%, 15%, 20% thresholds}`
- `cobalt.tax.ltcg({year, status, ordinaryTaxableIncome, ltcg})` → `{tax, marginalLtcgRate, breakdown, _meta}`
- `cobalt.tax.qualifiedDividends({year, status, ordinaryTaxableIncome, qualDiv})`
- `cobalt.tax.nii({year, status, magi, nii})` → `{surtax, _meta}`
