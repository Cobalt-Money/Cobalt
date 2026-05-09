import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import type * as TanStackRouter from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";

import { TransactionsTable } from "./transactions-table";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const mod = await importOriginal<typeof TanStackRouter>();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

function createMockTransaction(overrides: Partial<TransactionListItem> = {}): TransactionListItem {
  return {
    accountLogoDomain: null,
    accountName: "Checking",
    accountSubtype: "checking",
    accountType: "depository",
    amount: -12.34,
    authorizedDate: null,
    category: null,
    counterparties: null,
    date: "2025-01-15",
    id: "550e8400-e29b-41d4-a716-446655440001",
    institutionLogo: null,
    institutionName: "Test Bank",
    institutionUrl: null,
    location: null,
    lockedFields: [],
    logoUrl: null,
    merchantName: null,
    name: "Coffee Shop Purchase",
    notes: null,
    pending: false,
    plaidAccountId: "plaid-acc-1",
    source: "plaid",
    tagIds: [],
    website: null,
    ...overrides,
  };
}

describe(TransactionsTable, () => {
  it("shows the empty state when there are no transactions and loading is complete", () => {
    render(<TransactionsTable isComplete items={[]} />);

    expect(screen.getByText("No transactions yet")).toBeTruthy();
  });

  it("renders transaction name, formatted amount, and date when data is present", () => {
    render(<TransactionsTable isComplete items={[createMockTransaction()]} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Coffee Shop Purchase")).toBeTruthy();
    expect(within(table).getByText("$12.34")).toBeTruthy();
    expect(within(table).getByText("Jan 15, 2025")).toBeTruthy();
    expect(within(table).getByText("January 2025")).toBeTruthy();
    expect(
      within(table).getByRole("checkbox", {
        name: "Select transaction Coffee Shop Purchase",
      }),
    ).toBeTruthy();
  });
});
