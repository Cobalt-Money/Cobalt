import { vi, describe, expect, it } from "vitest";
import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { render, screen } from "@testing-library/react";

import { TransactionDetailView } from "./transaction-detail";

// @ts-expect-error -- mock stubs intentionally don't match exact module return types (Map is forwardRef, MarkerContent/MapControls return ReactPortal)
vi.mock(import("@cobalt-web/ui/components/ui/map"), () => ({
  Map: () => null,
  MapControls: () => null,
  MapMarker: () => null,
  MarkerContent: () => null,
}));

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

describe(TransactionDetailView, () => {
  it("renders merchant/title, formatted amount, and Activity", () => {
    render(<TransactionDetailView transaction={createMockTransaction()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Coffee Shop Purchase" })).toBeTruthy();
    expect(screen.getByText("$12.34")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Activity" })).toBeTruthy();
  });
});
