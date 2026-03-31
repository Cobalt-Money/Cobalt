import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import type * as TanStackRouter from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionDetailPage } from "./transaction-detail";

const TRANSACTION_ID = "550e8400-e29b-41d4-a716-446655440001";

const { mockNavigate, mockUseTransactions, mockUseParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(() => ({ transactionId: TRANSACTION_ID })),
  mockUseTransactions: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof TanStackRouter>();
  return {
    ...mod,
    getRouteApi: () => ({
      useParams: mockUseParams,
    }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../use-transactions", () => ({
  useTransactions: () => mockUseTransactions(),
}));

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
    id: TRANSACTION_ID,
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

describe("TransactionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockImplementation(() => ({ transactionId: TRANSACTION_ID }));
  });

  it("shows Loading when sync is not complete and there is no matching transaction", () => {
    mockUseTransactions.mockReturnValue({
      isComplete: false,
      items: [],
    });

    render(<TransactionDetailPage />);

    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("shows Loading when items do not include the route transaction id and sync is not complete", () => {
    mockUseTransactions.mockReturnValue({
      isComplete: false,
      items: [createMockTransaction({ id: "other-id" })],
    });

    render(<TransactionDetailPage />);

    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("navigates away when sync is complete and no transaction matches the id", async () => {
    mockUseTransactions.mockReturnValue({
      isComplete: true,
      items: [],
    });

    render(<TransactionDetailPage />);

    await waitFor(() => {
      expect(vi.mocked(mockNavigate)).toHaveBeenCalledWith({
        replace: true,
        to: "/transactions",
      });
    });
  });

  it("renders merchant/title, formatted amount, and Activity when the transaction is found", () => {
    mockUseTransactions.mockReturnValue({
      isComplete: true,
      items: [createMockTransaction()],
    });

    render(<TransactionDetailPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Coffee Shop Purchase" })
    ).toBeTruthy();
    expect(screen.getByText("$12.34")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Activity" })
    ).toBeTruthy();
  });
});
