---
id: reference-financial-glossary
title: Financial Glossary
description: Use when user asks "what does X mean" / "define X" / acronym lookup for financial, tax, investing, retirement, real estate, or insurance terms. Definitions only — cross-ref topic file for depth.
keywords: glossary, definition, define, acronym, AGI, MAGI, NIIT, AMT, SALT, QBI, RMD, FRA, IRMAA, basis, step-up, wash sale, vesting, double trigger, FIFO, EFC, SAI, FPL, IRR, NPV, FV, PV, APR, APY, escrow, PITI, LTV, DTI, cap rate, expense ratio, ETF, 1099
status: partial
jurisdiction: US
last_reviewed: 2026-05-27
sources:
  - name: "Investopedia (definitions only)"
    url: "https://www.investopedia.com/financial-term-dictionary-4769738"
  - name: "IRS Glossary"
    url: "https://apps.irs.gov/app/understandingTaxes/jsp/whys/lp/IWY1_glossary.jsp"
  - name: "SEC Investor.gov Glossary"
    url: "https://www.investor.gov/introduction-investing/investing-basics/glossary"
---

# Financial Glossary

Definitions only. One line each. For strategy or current figures, follow the cross-ref to the topic file, then `webFetch` source URLs.

## When to use

- User asks "what is X", "define X", "what does X stand for"
- Acronym appears mid-conversation and user pauses
- Disambiguating similar terms (AGI vs MAGI, ETF vs mutual fund, APR vs APY)

## STOP — refer to topic file

- For depth beyond a 1-line definition, route to the topic file in cross-refs.
- For current figures (limits, brackets, phase-outs), `webFetch` source URLs in that topic file.

## Terms

### Tax terms

- **AGI** — Adjusted Gross Income. Gross income minus above-the-line deductions. See `taxes-federal`.
- **MAGI** — Modified AGI. AGI with specific add-backs; definition varies by provision (Roth, IRMAA, ACA, NIIT each compute differently). See `taxes-federal`.
- **Marginal rate** — Tax rate on next dollar of income. See `taxes-federal`.
- **Effective rate** — Total tax ÷ total income. Always lower than marginal in progressive system. See `taxes-federal`.
- **Standard deduction** — Flat deduction available without itemizing. See `taxes-federal`.
- **Itemized deductions** — Schedule A: SALT, mortgage interest, charitable, medical over floor. See `taxes-federal`.
- **SALT** — State And Local Taxes deduction (capped). See `taxes-state`.
- **QBI** — Qualified Business Income deduction (Sec 199A) for pass-through income. See `taxes-self-employment`.
- **NIIT** — Net Investment Income Tax. Surcharge on investment income above MAGI threshold. See `taxes-capital-gains`.
- **AMT** — Alternative Minimum Tax. Parallel tax computation with own exemption. See `taxes-federal`.
- **FICA** — Social Security + Medicare payroll tax. See `taxes-federal`.
- **SE tax** — Self-employment tax (FICA equivalent for self-employed). See `taxes-self-employment`.
- **Above-the-line deduction** — Adjustment to income, taken before AGI. Available without itemizing.
- **Tax credit** — Dollar-for-dollar tax reduction. Stronger than deduction.
- **Refundable credit** — Credit that pays out even if tax is zero (EITC, partial AOTC).
- **Nonrefundable credit** — Reduces tax to zero but no payout (LLC, foreign tax credit subject to limit).
- **Withholding** — Tax prepaid via W-2 / 1099 / pension. See `taxes-federal`.
- **Estimated payments** — Quarterly tax prepayments (Form 1040-ES). See `taxes-self-employment`.
- **Safe harbor** — Estimated-payment threshold to avoid underpayment penalty. See `taxes-self-employment`.
- **Backdoor Roth** — Nondeductible trad IRA → Roth conversion. See `taxes-strategies`.
- **Mega backdoor Roth** — After-tax 401k contributions → in-plan Roth or rollover. See `retirement`.
- **Pro-rata rule** — Roth conversion taxation rule for mixed pre/post-tax IRA balances. See `taxes-strategies`.

### Capital gains / investing terms

- **Basis (cost basis)** — Original purchase price + adjustments. Determines gain at sale. See `taxes-capital-gains`.
- **Step-up basis** — Reset of basis to FMV at decedent's death. See `estate-planning`.
- **Capital gain — long-term** — Held >1 year. Preferential rates. See `taxes-capital-gains`.
- **Capital gain — short-term** — Held ≤1 year. Taxed as ordinary income. See `taxes-capital-gains`.
- **Qualified dividend** — Dividend taxed at LTCG rates (holding-period rules). See `taxes-capital-gains`.
- **Ordinary dividend** — Dividend taxed at ordinary income rates.
- **Wash sale** — Loss disallowed if substantially identical security bought within 30 days. See `taxes-capital-gains`.
- **FIFO** — First-In-First-Out lot accounting (default for most brokers). See `investing`.
- **LIFO** — Last-In-First-Out lot accounting.
- **Spec ID** — Specific-identification lot selection at sale. See `investing`.
- **Tax-loss harvesting** — Selling losers to offset gains. See `taxes-strategies`.
- **Expense ratio** — Annual fund cost as % of assets. See `investing`.
- **ETF** — Exchange-Traded Fund. Trades intraday; usually more tax-efficient than mutual fund. See `investing`.
- **Mutual fund** — Pooled fund priced once daily at NAV.
- **Index fund** — Fund tracking a market index. Low cost typical.
- **Sharpe ratio** — Risk-adjusted return: (return − risk-free) ÷ stdev. See `reference-financial-ratios`.
- **P/E** — Price-to-Earnings ratio. Valuation metric. See `investing`.
- **Dividend yield** — Annual dividend ÷ share price.
- **Beta** — Stock's volatility vs. market.

### Retirement terms

- **RMD** — Required Minimum Distribution from pre-tax retirement accounts. See `retirement`.
- **FRA** — Full Retirement Age for Social Security. See `retirement`.
- **IRMAA** — Income-Related Monthly Adjustment Amount (Medicare premium surcharge). See `medicare`.
- **MAGI lookback** — IRMAA uses MAGI from 2 years prior. See `medicare`.
- **Inherited IRA** — IRA received from decedent. 10-year rule for most non-spouse beneficiaries. See `retirement`.
- **Roth conversion** — Moving pre-tax retirement $ to Roth, paying tax now. See `taxes-strategies`.
- **5-year rule (Roth)** — Holding-period for tax-free Roth earnings withdrawal. See `retirement`.
- **Catch-up contribution** — Extra contribution allowed age 50+. See `retirement`.
- **Vesting** — Earning the right to employer contributions over time. See `retirement`.
- **Cliff vesting** — All-or-nothing vesting at a date.
- **Graded vesting** — Gradual vesting over years.
- **Double-trigger** — RSU/option vest requiring two events (e.g., time + liquidity). See `retirement`.

### Aid / education / benefits terms

- **EFC** — Expected Family Contribution (pre-FAFSA-Simplification term). See `education-planning`.
- **SAI** — Student Aid Index (replaced EFC). See `education-planning`.
- **FPL** — Federal Poverty Level. Used for ACA subsidies, Medicaid eligibility. See `healthcare`.
- **HSA** — Health Savings Account (paired with HDHP). See `healthcare`.
- **FSA** — Flexible Spending Account (use-it-or-lose-it). See `healthcare`.

### Time-value / math terms

- **IRR** — Internal Rate of Return. Discount rate making NPV zero.
- **NPV** — Net Present Value. Sum of discounted cash flows.
- **FV** — Future Value of money at a rate over time.
- **PV** — Present Value of future cash flows.
- **APR** — Annual Percentage Rate. Stated rate, no compounding effect.
- **APY** — Annual Percentage Yield. Effective rate including compounding.

### Real estate / lending terms

- **Escrow** — Held funds (deposit, taxes, insurance) by third party. See `real-estate`.
- **PITI** — Principal + Interest + Taxes + Insurance (monthly housing cost). See `real-estate`.
- **LTV** — Loan-To-Value (loan ÷ home value). See `real-estate`.
- **DTI** — Debt-To-Income (monthly debt ÷ gross monthly income). Front-end vs back-end. See `reference-financial-ratios`.
- **Cap rate** — Capitalization rate: NOI ÷ property value. Rental analysis. See `real-estate`.
- **Cash-on-cash** — Annual pre-tax cash flow ÷ cash invested. See `real-estate`.
- **NOI** — Net Operating Income (rental income − operating expenses, excludes debt service).
- **PMI** — Private Mortgage Insurance (LTV >80% conventional). See `real-estate`.
- **HELOC** — Home Equity Line Of Credit. Revolving second-lien.
- **Refi** — Refinance (rate-and-term or cash-out).

### 1099 forms

- **1099-NEC** — Nonemployee Compensation (contractor pay). See `taxes-self-employment`.
- **1099-MISC** — Misc income (rent, prizes, attorney pay).
- **1099-DIV** — Dividends and capital-gain distributions. See `taxes-capital-gains`.
- **1099-INT** — Interest income.
- **1099-B** — Brokerage proceeds (sales). See `taxes-capital-gains`.
- **1099-R** — Retirement distributions. See `retirement`.
- **1099-K** — Payment-card / third-party-network payments.
- **1099-SA** — HSA distributions. See `healthcare`.

### Estate / gift terms

- **Probate** — Court-supervised estate settlement. See `estate-planning`.
- **Intestate** — Dying without a will. State intestacy law governs.
- **DSUE** — Deceased Spousal Unused Exclusion (portability). See `estate-planning`.
- **GST** — Generation-Skipping Transfer tax. See `estate-planning`.
- **JTWROS** — Joint Tenancy With Right Of Survivorship.
- **TBE** — Tenancy By the Entirety (spouse-only joint ownership in some states).
- **TOD / POD** — Transfer-On-Death / Payable-On-Death account designation. See `estate-planning`.
- **ILIT** — Irrevocable Life Insurance Trust. See `reference-insurance`.

## Cross-refs

- `taxes-federal`, `taxes-state`, `taxes-capital-gains`, `taxes-self-employment`, `taxes-strategies`, `taxes-life-events`
- `investing`, `investing-budgeting`, `investing-debt-management`
- `retirement`, `medicare`, `healthcare`
- `real-estate`
- `estate-planning`, `education-planning`
- `reference-insurance`, `reference-financial-ratios`

## Function dependencies (future, tracked in Linear)

- None — this file is pure reference.
