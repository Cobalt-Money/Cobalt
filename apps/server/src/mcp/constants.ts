export const MAX_ROWS = 500;
export const DEFAULT_ROWS = 100;
export const QUERY_TIMEOUT_MS = 10_000;
export const CHARACTER_LIMIT = 25_000;

export const ALLOWED_TABLES: Record<string, string> = {
  bank_account: "Individual bank accounts within connections",
  bank_balance: "Latest balance for each bank account",
  bank_balance_snapshot: "Historical daily balance snapshots",
  bank_connection: "Linked bank connections (Plaid items)",
  brokerage_account: "Brokerage accounts (SnapTrade)",
  brokerage_account_detail: "Brokerage account details and metadata",
  brokerage_activity: "Brokerage transaction history",
  brokerage_authorization: "Brokerage connection authorizations",
  brokerage_balance: "Brokerage account balances",
  brokerage_order: "Brokerage orders",
  brokerage_position: "Current brokerage holdings",
  brokerage_user: "Brokerage user profiles (SnapTrade)",
  credit_liability: "Credit card liability details",
  financial_goals: "User-defined financial goals",
  institution: "Bank/institution reference data (public)",
  investment_activity: "Investment transaction history",
  investment_position: "Current investment holdings per account",
  investment_security: "Investment securities reference data (public)",
  mortgage_liability: "Mortgage loan details",
  portfolio_snapshot: "Historical portfolio value snapshots",
  recurring_stream: "Detected recurring transactions/subscriptions",
  student_loan_liability: "Student loan details",
  transaction: "Bank transactions (posted and pending)",
  // user_alerts: "User-configured financial alerts",
};
