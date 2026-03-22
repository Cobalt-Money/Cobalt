// items
export {
  institution,
  bankConnection,
  type Institution,
  type InstitutionSelect,
  type BankConnection,
  type BankConnectionSelect,
} from "./items";

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
