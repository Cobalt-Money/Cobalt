import { describe, expect, it } from "vitest";

import type { AccountsFilter } from "../accounts-toolbar.js";
import { filterAccountCardsForToolbar } from "./accounts-list-model.js";
import { bankAccountRowToCard } from "./map-zero-to-account-cards.js";
import type {
  AccountCardViewModel,
  BankAccountRowWithRelations,
} from "./map-zero-to-account-cards.js";

function fakeCard(id: string, category: AccountCardViewModel["category"]): AccountCardViewModel {
  return {
    accountTypeLabel: "x",
    category,
    description: "x",
    id,
    institution: "x",
    institutionLogo: null,
    institutionUrl: null,
    isCustomNamed: false,
    kind: "bank",
    lastSyncedAt: null,
    mask: "0000",
    plaidAccountId: null,
    plaidItemId: null,
    snaptradeAuthorizationId: null,
    source: "manual",
    subtype: null,
  };
}

function bankRow(overrides: Partial<BankAccountRowWithRelations>): BankAccountRowWithRelations {
  const base = {
    balance: undefined,
    customName: null,
    externalId: null,
    id: "acc-1",
    institutionName: null,
    logoDomain: null,
    mask: null,
    name: "Account",
    officialName: null,
    plaidConnection: undefined,
    source: "manual",
    subtype: null,
    type: "depository",
    updatedAt: 0,
  };
  return { ...base, ...overrides } as unknown as BankAccountRowWithRelations;
}

describe("bankAccountRowToCard", () => {
  it("buckets manual depository subtype=cash under 'cash'", () => {
    const card = bankAccountRowToCard(
      bankRow({ name: "Cash", source: "manual", subtype: "cash", type: "depository" }),
    );
    expect(card.category).toBe("cash");
    expect(card.subtype).toBe("cash");
    expect(card.source).toBe("manual");
  });

  it("treats subtype 'CASH' case-insensitively", () => {
    const card = bankAccountRowToCard(
      bankRow({ source: "manual", subtype: "CASH", type: "depository" }),
    );
    expect(card.category).toBe("cash");
  });

  it("buckets subtype=checking under 'banking' (failure-mode for pre-fix rows)", () => {
    const card = bankAccountRowToCard(
      bankRow({ source: "manual", subtype: "checking", type: "depository" }),
    );
    expect(card.category).toBe("banking");
  });

  it("buckets subtype=savings under 'savings'", () => {
    const card = bankAccountRowToCard(
      bankRow({ source: "manual", subtype: "savings", type: "depository" }),
    );
    expect(card.category).toBe("savings");
  });

  it("buckets null subtype depository under 'banking'", () => {
    const card = bankAccountRowToCard(
      bankRow({ source: "manual", subtype: null, type: "depository" }),
    );
    expect(card.category).toBe("banking");
  });

  it("renders even when balance row is missing (orphan account)", () => {
    const card = bankAccountRowToCard(
      bankRow({
        balance: undefined,
        source: "manual",
        subtype: "cash",
        type: "depository",
        updatedAt: 1_700_000_000_000,
      }),
    );
    expect(card.category).toBe("cash");
    expect(card.lastSyncedAt).toBe(1_700_000_000_000);
  });

  it("does not classify credit subtype as cash", () => {
    const card = bankAccountRowToCard(
      bankRow({ source: "manual", subtype: "cash", type: "credit" }),
    );
    expect(card.category).toBe("credit");
  });
});

describe("filterAccountCardsForToolbar with cash filter", () => {
  const items: AccountCardViewModel[] = [
    fakeCard("1", "cash"),
    fakeCard("2", "banking"),
    fakeCard("3", "savings"),
  ];

  const cash: AccountsFilter = "cash";
  const banking: AccountsFilter = "banking";

  it("'cash' filter returns only cash cards", () => {
    expect(filterAccountCardsForToolbar(items, cash).map((c) => c.id)).toStrictEqual(["1"]);
  });

  it("'banking' filter excludes cash cards (no leakage)", () => {
    expect(filterAccountCardsForToolbar(items, banking).map((c) => c.id)).toStrictEqual(["2"]);
  });

  it("'all' filter includes cash", () => {
    expect(filterAccountCardsForToolbar(items, "all").map((c) => c.id)).toStrictEqual([
      "1",
      "2",
      "3",
    ]);
  });
});
