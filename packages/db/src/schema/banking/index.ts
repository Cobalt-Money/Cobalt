// items — `zod.ts` (jsonb) + per-table files (Drizzle); barrel is this file only
export {
  bankConnectionJsonbSelectRefinements,
  institutionJsonbSelectRefinements,
  plaidItemErrorJsonSchema,
  stringArrayJsonSchema,
} from "./items/zod";
export { institution } from "./items/institution";
export { bankConnection } from "./items/bank-connection";
export type { PlaidItemErrorJson, StringArrayJson } from "./items/zod";
export type { Institution, InstitutionSelect } from "./items/institution";
export type {
  BankConnection,
  BankConnectionSelect,
} from "./items/bank-connection";

// accounts
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
} from "./accounts";

// transactions — `zod.ts` (jsonb) + `tables.ts` (Drizzle); barrel is this file only
export {
  counterpartiesArrayJsonSchema,
  legacyCategoryArrayJsonSchema,
  locationJsonSchema,
  numbersIbanNullableJsonSchema,
  paymentMetaJsonSchema,
  personalFinanceCategoryJsonSchema,
  recurringStreamJsonbSelectRefinements,
  recurringTransactionIdsJsonSchema,
  transactionCounterpartyJsonSchema,
  transactionCounterpartyTypeSchema,
  transactionJsonbSelectRefinements,
  userOverrideCategoryJsonSchema,
} from "./transactions/zod";
export { recurringStream, transaction } from "./transactions/tables";
export type {
  CounterpartiesArrayJson,
  CounterpartyNumbersBacsJson,
  CounterpartyNumbersInternationalJson,
  CounterpartyNumbersJson,
  LegacyCategoryArrayJson,
  LocationJson,
  NumbersIbanNullableJson,
  PaymentMetaJson,
  PersonalFinanceCategoryJson,
  RecurringTransactionIdsJson,
  TransactionCounterpartyJson,
  TransactionCounterpartyType,
  TransactionNotesJson,
  UserOverrideCategoryJson,
} from "./transactions/zod";
export type {
  RecurringStream,
  RecurringStreamSelect,
  Transaction,
  TransactionSelect,
} from "./transactions/tables";

// liabilities
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
} from "./liabilities";

// investments
export {
  investmentSecurity,
  investmentPosition,
  investmentActivity,
  type InvestmentSecurity,
  type InvestmentSecuritySelect,
  type InvestmentPosition,
  type InvestmentPositionSelect,
  type InvestmentActivity,
  type InvestmentActivitySelect,
} from "./investments";
