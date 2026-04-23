import type { AccountBase } from "plaid";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncLiabilities } from "./orchestration";
import {
  fetchPlaidLiabilitiesStep,
  persistPlaidCreditLiabilitiesStep,
  persistPlaidLiabilityBankAccountsStep,
  persistPlaidLiabilityBankBalancesStep,
  persistPlaidMortgageLiabilitiesStep,
  persistPlaidStudentLoanLiabilitiesStep,
} from "./steps";

vi.mock(import("./steps"), () => ({
  fetchPlaidLiabilitiesStep: vi.fn(),
  persistPlaidCreditLiabilitiesStep: vi.fn(),
  persistPlaidLiabilityBankAccountsStep: vi.fn(),
  persistPlaidLiabilityBankBalancesStep: vi.fn(),
  persistPlaidMortgageLiabilitiesStep: vi.fn(),
  persistPlaidStudentLoanLiabilitiesStep: vi.fn(),
}));

const mockFetch = vi.mocked(fetchPlaidLiabilitiesStep);
const mockAccounts = vi.mocked(persistPlaidLiabilityBankAccountsStep);
const mockBalances = vi.mocked(persistPlaidLiabilityBankBalancesStep);
const mockCredit = vi.mocked(persistPlaidCreditLiabilitiesStep);
const mockMortgage = vi.mocked(persistPlaidMortgageLiabilitiesStep);
const mockStudent = vi.mocked(persistPlaidStudentLoanLiabilitiesStep);

describe("syncLiabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when Plaid says the product is not ready / skipped", async () => {
    mockFetch.mockResolvedValue({ skipped: true });

    await syncLiabilities("tok", "item-1");

    expect(mockAccounts).not.toHaveBeenCalled();
    expect(mockBalances).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
    expect(mockMortgage).not.toHaveBeenCalled();
    expect(mockStudent).not.toHaveBeenCalled();
  });

  it("persists accounts + balances then all three liability types when fetched", async () => {
    const accounts: AccountBase[] = [{} as AccountBase];
    mockFetch.mockResolvedValue({
      accounts,
      liabilities: { credit: null, mortgage: null, student: null },
      skipped: false,
    });

    await syncLiabilities("tok", "item-1");

    expect(mockAccounts).toHaveBeenCalledWith("item-1", accounts);
    expect(mockBalances).toHaveBeenCalledWith(accounts);
    expect(mockCredit).toHaveBeenCalledWith(null);
    expect(mockMortgage).toHaveBeenCalledWith(null);
    expect(mockStudent).toHaveBeenCalledWith(null);
  });
});
