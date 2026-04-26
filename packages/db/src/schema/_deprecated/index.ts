// Pre-SRI-264 / pre-SRI-248 schema. Kept on disk only so drizzle-kit and the
// Drizzle runtime client still see the tables in production until callers
// finish migrating. Do NOT import from here in application code — every
// table here has a successor under schema/accounts/* or
// schema/providers/*. Slated for deletion after the next release cycle
// (tracked in SRI-303).

// ---- banking (legacy) ----
export { bankConnection } from "./banking/items/bank-connection";
export type {
  BankConnection,
  BankConnectionSelect,
} from "./banking/items/bank-connection";

export {
  bankAccount,
  bankBalance,
  bankBalanceSnapshot,
  type BankAccount,
  type BankAccountSelect,
  type BankBalance,
  type BankBalanceSelect,
  type BankBalanceSnapshot,
  type BankBalanceSnapshotSelect,
} from "./banking/accounts";

export { recurringStream, transaction } from "./banking/transactions/tables";
export type {
  RecurringStream,
  RecurringStreamSelect,
  Transaction,
  TransactionSelect,
} from "./banking/transactions/tables";

export {
  creditLiability,
  mortgageLiability,
  studentLoanLiability,
  type CreditLiability,
  type CreditLiabilitySelect,
  type MortgageLiability,
  type MortgageLiabilitySelect,
  type StudentLoanLiability,
  type StudentLoanLiabilitySelect,
} from "./banking/liabilities";

export {
  investmentActivity,
  investmentPosition,
  investmentSecurity,
  type InvestmentActivity,
  type InvestmentActivitySelect,
  type InvestmentPosition,
  type InvestmentPositionSelect,
  type InvestmentSecurity,
  type InvestmentSecuritySelect,
} from "./banking/investments";

// ---- brokerage (legacy) ----
export * from "./brokerage";
