/**
 * Explicit row shapes for Zero `useQuery` results.
 * drizzle-zero 0.17 + Drizzle 1.x does not infer `CustomType` from column defs yet,
 * so query rows would otherwise be `unknown`.
 */
export interface TransactionListRow {
  id: string;
  date: number;
  name: string;
  userOverrideName: string | null;
  amount: number;
}

export interface CreditSpendingRow {
  amount: number;
  date: number;
}

export interface RecurringStreamListRow {
  id: string;
  description: string;
  merchantName: string | null;
  lastDate: number;
  lastAmount: number;
}
