import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TransactionDetailView } from "./transaction-detail";

vi.mock("@cobalt-web/ui/components/ui/map", () => ({
  Map: () => null,
  MapControls: () => null,
  MapMarker: () => null,
  MarkerContent: () => null,
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

describe("TransactionDetailView", () => {
  it("renders merchant/title, formatted amount, and Activity", () => {
    render(<TransactionDetailView transaction={createMockTransaction()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Coffee Shop Purchase" })
    ).toBeTruthy();
    expect(screen.getByText("$12.34")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Activity" })
    ).toBeTruthy();
  });
});
