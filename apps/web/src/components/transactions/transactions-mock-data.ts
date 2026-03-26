/** Static rows for layout and table behavior only — replace with Zero when wiring data. */
export interface TransactionRow {
  id: string;
  /** UTC instant for sorting / display */
  date: Date;
  merchant: string;
  category: string;
  account: string;
  /** Negative = outflow, positive = inflow */
  amountCents: number;
  status: "pending" | "posted";
}

export const MOCK_TRANSACTIONS: TransactionRow[] = [
  {
    account: "Checking ···4821",
    amountCents: -8425,
    category: "Groceries",
    date: new Date("2025-03-24T12:00:00Z"),
    id: "1",
    merchant: "Whole Foods Market",
    status: "posted",
  },
  {
    account: "Checking ···4821",
    amountCents: 325_000,
    category: "Income",
    date: new Date("2025-03-23T15:30:00Z"),
    id: "2",
    merchant: "Payroll Deposit",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -4800,
    category: "Auto & transport",
    date: new Date("2025-03-23T09:12:00Z"),
    id: "3",
    merchant: "Shell",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -1599,
    category: "Subscriptions",
    date: new Date("2025-03-22T18:45:00Z"),
    id: "4",
    merchant: "Netflix",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -6733,
    category: "Shopping",
    date: new Date("2025-03-22T11:00:00Z"),
    id: "5",
    merchant: "Amazon",
    status: "pending",
  },
  {
    account: "Credit ···9012",
    amountCents: -625,
    category: "Dining",
    date: new Date("2025-03-21T08:20:00Z"),
    id: "6",
    merchant: "Blue Bottle Coffee",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -2840,
    category: "Travel",
    date: new Date("2025-03-20T22:10:00Z"),
    id: "7",
    merchant: "Uber",
    status: "posted",
  },
  {
    account: "Checking ···4821",
    amountCents: -50_000,
    category: "Transfer",
    date: new Date("2025-03-20T14:00:00Z"),
    id: "8",
    merchant: "Transfer to savings",
    status: "posted",
  },
  {
    account: "Checking ···4821",
    amountCents: -12_450,
    category: "Bills & utilities",
    date: new Date("2025-03-19T16:40:00Z"),
    id: "9",
    merchant: "PG&E",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -11_208,
    category: "Shopping",
    date: new Date("2025-03-18T13:25:00Z"),
    id: "10",
    merchant: "Target",
    status: "posted",
  },
  {
    account: "Savings ···7730",
    amountCents: 412,
    category: "Income",
    date: new Date("2025-03-17T10:05:00Z"),
    id: "11",
    merchant: "Interest earned",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -1099,
    category: "Subscriptions",
    date: new Date("2025-03-16T19:50:00Z"),
    id: "12",
    merchant: "Spotify",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -5612,
    category: "Groceries",
    date: new Date("2025-03-15T07:30:00Z"),
    id: "13",
    merchant: "Trader Joe's",
    status: "posted",
  },
  {
    account: "Checking ···4821",
    amountCents: -20_000,
    category: "Cash",
    date: new Date("2025-03-14T12:15:00Z"),
    id: "14",
    merchant: "ATM withdrawal",
    status: "posted",
  },
  {
    account: "Credit ···9012",
    amountCents: -42_890,
    category: "Travel",
    date: new Date("2025-03-13T17:00:00Z"),
    id: "15",
    merchant: "Delta Air Lines",
    status: "pending",
  },
];
