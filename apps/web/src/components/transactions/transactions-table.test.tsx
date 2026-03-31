import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TransactionsTable } from "./transactions-table";

const { mockUseTransactions } = vi.hoisted(() => ({
  mockUseTransactions: vi.fn(),
}));

vi.mock("./use-transactions", () => ({
  useTransactions: () => mockUseTransactions(),
}));

function createMockTransaction(
  overrides: Partial<TransactionListItem> = {}
): TransactionListItem {
  return {
    accountName: "Checking",
    accountType: "depository",
    amount: -12.34,
    authorizedDate: null,
    counterparties: null,
    date: "2025-01-15",
    id: "550e8400-e29b-41d4-a716-446655440001",
    institutionLogo: null,
    institutionName: "Test Bank",
    institutionUrl: null,
    location: null,
    logoUrl: null,
    merchantName: null,
    name: "Coffee Shop Purchase",
    pending: false,
    personalFinanceCategory: null,
    plaidAccountId: "plaid-acc-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
    ...overrides,
  };
}

describe("TransactionsTable", () => {
  it("shows the empty state when there are no transactions and loading is complete", () => {
    mockUseTransactions.mockReturnValue({
      isComplete: true,
      items: [],
    });

    render(<TransactionsTable />);

    expect(screen.getByText("No transactions yet.")).toBeTruthy();
  });

  it("renders transaction name, formatted amount, and date when data is present", () => {
    mockUseTransactions.mockReturnValue({
      isComplete: true,
      items: [createMockTransaction()],
    });

    render(<TransactionsTable />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Coffee Shop Purchase")).toBeTruthy();
    expect(within(table).getByText("$12.34")).toBeTruthy();
    expect(within(table).getByText("Jan 15, 2025")).toBeTruthy();
    expect(within(table).getByText("January 2025")).toBeTruthy();
    expect(
      within(table).getByRole("checkbox", {
        name: "Select transaction Coffee Shop Purchase",
      })
    ).toBeTruthy();
  });
});
