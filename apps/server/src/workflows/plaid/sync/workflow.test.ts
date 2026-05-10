import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncHoldings, syncInvestmentTransactions } from "../investments/orchestration";
import { syncLiabilities } from "../liabilities/orchestration";
import {
  closeOnboardingProgressStep,
  duplicateCheckStep,
  emitOnboardingProgressStep,
  exchangePublicTokenStep,
  fetchItemForOnboardingStep,
  getPlaidItemStep,
  persistOnboardingItemStep,
  reconcileOrphanAccountsStep,
  removeItemStep,
  seedTodayPlaidSnapshotsStep,
  syncAccountsAndBalancesStep,
  syncBalancesStep,
  syncRecurringStep,
  syncTransactionsStep,
  triggerPlaidSyncStep,
} from "./steps.js";
import { plaidAddAccountWorkflow, plaidOnboardingHookToken } from "./workflow.js";

const HOOK_TOKEN = "plaid:link:user-1:test-hook";

vi.mock(import("./steps.js"), () => ({
  clearItemErrorStep: vi.fn(),
  closeOnboardingProgressStep: vi.fn(),
  dispatchSnapshotWorkflowStep: vi.fn(),
  duplicateCheckStep: vi.fn(),
  emitOnboardingProgressStep: vi.fn(),
  exchangePublicTokenStep: vi.fn(),
  fetchItemForOnboardingStep: vi.fn(),
  getPlaidItemStep: vi.fn(),
  persistNewAccountsForItemStep: vi.fn(),
  persistOnboardingItemStep: vi.fn(),
  reconcileOrphanAccountsStep: vi.fn(),
  removeItemStep: vi.fn(),
  seedTodayPlaidSnapshotsStep: vi.fn(),
  syncAccountsAndBalancesStep: vi.fn(),
  syncBalancesStep: vi.fn(),
  syncRecurringStep: vi.fn(),
  syncTransactionsStep: vi.fn(),
  triggerPlaidSyncStep: vi.fn(),
  updateItemStateStep: vi.fn(),
}));

vi.mock(import("../investments/orchestration"), () => ({
  syncHoldings: vi.fn(),
  syncInvestmentTransactions: vi.fn(),
}));

vi.mock(import("../liabilities/orchestration"), () => ({
  syncLiabilities: vi.fn(),
}));

// Iterable hook: each call to `next()` yields the next queued payload.
// We control what the mocked hook yields per test.
const mockHookPayloads = vi.hoisted<{
  current: {
    initial_update_complete: boolean;
    historical_update_complete: boolean;
  }[];
}>(() => ({
  current: [],
}));

vi.mock(import("workflow"), async () => {
  const actual = await vi.importActual<typeof import("workflow")>("workflow");
  return {
    ...actual,
    // Shim: the add-account workflow creates two hooks — the link hook
    // (single-shot, awaited as a thenable) and the sync hook (iterable,
    // consumed with `for await`). Dispatch on token prefix.
    createHook: vi.fn((opts: { token: string }) => {
      if (opts.token.startsWith("plaid:link:")) {
        const p = Promise.resolve({ publicToken: PUBLIC_TOKEN });
        return p as unknown as ReturnType<typeof actual.createHook>;
      }
      const payloads = [...mockHookPayloads.current];
      return {
        [Symbol.asyncIterator]() {
          return {
            next() {
              const value = payloads.shift();
              return Promise.resolve(
                value === undefined ? { done: true, value: undefined } : { done: false, value },
              );
            },
          };
        },
      } as unknown as ReturnType<typeof actual.createHook>;
    }) as unknown as typeof actual.createHook,
  };
});

const mockExchange = vi.mocked(exchangePublicTokenStep);
const mockFetchItem = vi.mocked(fetchItemForOnboardingStep);
const mockDupCheck = vi.mocked(duplicateCheckStep);
const mockRemoveItem = vi.mocked(removeItemStep);
const mockPersist = vi.mocked(persistOnboardingItemStep);
const mockTriggerSync = vi.mocked(triggerPlaidSyncStep);
const mockGetItem = vi.mocked(getPlaidItemStep);
const mockEmit = vi.mocked(emitOnboardingProgressStep);
const mockClose = vi.mocked(closeOnboardingProgressStep);
const mockAccounts = vi.mocked(syncAccountsAndBalancesStep);
const mockReconcile = vi.mocked(reconcileOrphanAccountsStep);
const mockTx = vi.mocked(syncTransactionsStep);
const mockBalances = vi.mocked(syncBalancesStep);
const mockRecurring = vi.mocked(syncRecurringStep);
const mockSeedSnapshots = vi.mocked(seedTodayPlaidSnapshotsStep);
const mockHoldings = vi.mocked(syncHoldings);
const mockInvTx = vi.mocked(syncInvestmentTransactions);
const mockLiabilities = vi.mocked(syncLiabilities);

const ITEM_ID = "item-abc";
const PUBLIC_TOKEN = "public-sandbox-token";
const ACCESS_TOKEN = "access-xyz";
const USER_ID = "user-1";

function fakeItem(
  overrides: {
    available_products?: string[];
    billed_products?: string[];
    institution_id?: string | null;
  } = {},
) {
  return {
    available_products: overrides.available_products ?? ["transactions"],
    billed_products: overrides.billed_products ?? ["transactions"],
    institution_id: overrides.institution_id ?? "ins_1",
    webhook: "https://example.com/hook",
  };
}

function fakeDbItem() {
  return {
    plaidAccessToken: ACCESS_TOKEN,
    plaidItemId: ITEM_ID,
    transactionsCursor: null,
    userId: USER_ID,
  } as Awaited<ReturnType<typeof getPlaidItemStep>>;
}

function fakeBalances() {
  return {
    accounts: [
      {
        account_id: "acc-1",
        balances: { available: 100, current: 500, limit: null },
      },
    ],
  } as unknown as Awaited<ReturnType<typeof syncBalancesStep>>;
}

function fakeTxResult() {
  return { added: 3, modified: 1, removed: 0 };
}

describe("plaidOnboardingHookToken", () => {
  it("returns a deterministic token keyed on itemId", () => {
    expect(plaidOnboardingHookToken("item-xyz")).toBe("plaid:sync:item-xyz");
  });
});

describe("plaidAddAccountWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookPayloads.current = [
      { historical_update_complete: true, initial_update_complete: true },
    ];
    mockExchange.mockResolvedValue({
      accessToken: ACCESS_TOKEN,
      itemId: ITEM_ID,
    });
    mockFetchItem.mockResolvedValue({
      accounts: [
        {
          account_id: "acc-1",
          mask: "1234",
          name: "Checking",
          type: "depository",
        },
      ],
      item: fakeItem(),
    } as unknown as Awaited<ReturnType<typeof fetchItemForOnboardingStep>>);
    mockDupCheck.mockResolvedValue({
      duplicateAccounts: [],
      isDuplicate: false,
    });
    mockGetItem.mockResolvedValue(fakeDbItem());
    mockBalances.mockResolvedValue(fakeBalances());
    mockTx.mockResolvedValue(fakeTxResult());
    mockAccounts.mockResolvedValue({
      accounts: [],
      accountsCount: 0,
    } as unknown as Awaited<ReturnType<typeof syncAccountsAndBalancesStep>>);
    mockReconcile.mockResolvedValue({ migrated: 0, reconciled: 0 });
    mockRecurring.mockResolvedValue({
      added: 0,
      modified: 0,
      removed: 0,
      success: true,
    });
    mockSeedSnapshots.mockResolvedValue();
  });

  it("exchanges the public token and runs core sync steps on the happy path", async () => {
    const result = await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    expect(result).toStrictEqual({ itemId: ITEM_ID, success: true });
    expect(mockExchange).toHaveBeenCalledWith(PUBLIC_TOKEN);
    expect(mockFetchItem).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(mockPersist).toHaveBeenCalledOnce();
    expect(mockTriggerSync).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(mockAccounts).toHaveBeenCalledWith(ACCESS_TOKEN, ITEM_ID);
    expect(mockTx).toHaveBeenCalledWith(ACCESS_TOKEN, ITEM_ID, null);
    expect(mockBalances).toHaveBeenCalledWith(ACCESS_TOKEN, ITEM_ID);
  });

  it("emits exchange → validate → persist → waiting_for_plaid → accounts → transactions → historical → done", async () => {
    await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    const phases = mockEmit.mock.calls.map(([event]) => event.phase);
    expect(phases).toContain("exchange");
    expect(phases).toContain("validate");
    expect(phases).toContain("persist");
    expect(phases).toContain("waiting_for_plaid");
    expect(phases).toContain("accounts");
    expect(phases).toContain("transactions");
    expect(phases).toContain("historical");
    expect(phases).toContain("done");
    // Exchange must happen before validate, validate before persist.
    expect(phases.indexOf("exchange")).toBeLessThan(phases.indexOf("validate"));
    expect(phases.indexOf("validate")).toBeLessThan(phases.indexOf("persist"));
    expect(phases.indexOf("persist")).toBeLessThan(phases.indexOf("waiting_for_plaid"));
  });

  it("terminates with DUPLICATE_ACCOUNT when dup check matches, removes item, does not persist", async () => {
    mockDupCheck.mockResolvedValue({
      duplicateAccounts: [{ createdAt: new Date(), name: "Existing Checking" }],
      isDuplicate: true,
    });

    const result = await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      error: "DUPLICATE_ACCOUNT",
      success: false,
    });
    expect(mockRemoveItem).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockTriggerSync).not.toHaveBeenCalled();

    const phases = mockEmit.mock.calls.map(([event]) => event.phase);
    expect(phases).toContain("duplicate");
  });

  it("runs holdings + investment-tx branches when item has investments product", async () => {
    mockFetchItem.mockResolvedValue({
      accounts: [],
      item: fakeItem({
        available_products: ["transactions", "investments"],
        billed_products: ["transactions", "investments"],
      }),
    } as unknown as Awaited<ReturnType<typeof fetchItemForOnboardingStep>>);

    await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    expect(mockHoldings).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(mockInvTx).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(mockLiabilities).not.toHaveBeenCalled();
    const phases = mockEmit.mock.calls.map(([event]) => event.phase);
    expect(phases).toContain("holdings");
    expect(phases).toContain("investment_transactions");
  });

  it("runs liabilities branch when item has liabilities product", async () => {
    mockFetchItem.mockResolvedValue({
      accounts: [],
      item: fakeItem({
        available_products: ["transactions", "liabilities"],
        billed_products: ["transactions", "liabilities"],
      }),
    } as unknown as Awaited<ReturnType<typeof fetchItemForOnboardingStep>>);

    await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    expect(mockLiabilities).toHaveBeenCalledWith(ACCESS_TOKEN, ITEM_ID);
    expect(mockHoldings).not.toHaveBeenCalled();
    const phases = mockEmit.mock.calls.map(([event]) => event.phase);
    expect(phases).toContain("liabilities");
  });

  it("skips snapshot seed + recurring when only initial_update_complete arrives", async () => {
    mockHookPayloads.current = [
      { historical_update_complete: false, initial_update_complete: true },
    ];

    await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    expect(mockSeedSnapshots).not.toHaveBeenCalled();
    expect(mockRecurring).not.toHaveBeenCalled();
  });

  it("closes progress stream on success", async () => {
    await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it("closes progress stream and returns failure on error", async () => {
    mockExchange.mockRejectedValueOnce(new Error("plaid down"));

    const result = await plaidAddAccountWorkflow({
      hookToken: HOOK_TOKEN,
      userId: USER_ID,
    });

    expect(result).toMatchObject({ success: false });
    expect(mockClose).toHaveBeenCalledOnce();
  });
});
