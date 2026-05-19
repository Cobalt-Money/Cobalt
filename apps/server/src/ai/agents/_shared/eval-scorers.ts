import { createScorer } from "evalite";

import type { AccountSuggestion } from "../import/csv-account-mapping/csv-account-mapping-agent.js";
import type { CategorySuggestion } from "../import/csv-category-mapping/csv-category-mapping-agent.js";
import type { CsvMappingAi } from "../import/csv-column-mapping/csv-column-mapping-agent.js";

export interface ColumnExpected {
  accountNull?: boolean;
  amountKind?: "signed" | "split" | "magnitude_type";
  dateFormat?: string;
  dateKind?: "column" | "missing";
  debitValues?: string[];
  magnitudeColumn?: string;
  parensNegative?: boolean;
  typeColumn?: string;
}

export interface AccountExpected {
  byLabel: Record<
    string,
    {
      accountId?: string;
      action: "link" | "create_new" | "skip";
      suggestedSubtype?: string;
      suggestedType?: "depository" | "credit" | "investment" | "loan";
    }
  >;
}

export interface CategoryExpected {
  byLabel: Record<
    string,
    {
      action: "link" | "skip";
      targetCategoryId?: string | null;
    }
  >;
}

export const columnShapeScorer = createScorer<unknown, CsvMappingAi, ColumnExpected>({
  description: "Checks amount.kind / date.kind / account null / parens-neg match expected.",
  name: "Column Shape",
  scorer: ({ output, expected }) => {
    if (!expected) {
      return 1;
    }
    const checks: boolean[] = [];
    if (expected.amountKind) {
      checks.push(output.amount.kind === expected.amountKind);
    }
    if (expected.dateKind) {
      checks.push(output.date.kind === expected.dateKind);
    }
    if (expected.accountNull !== undefined) {
      checks.push((output.account === null) === expected.accountNull);
    }
    if (expected.parensNegative !== undefined && output.amount.kind === "signed") {
      checks.push(output.amount.parensNegative === expected.parensNegative);
    }
    if (expected.dateFormat && output.date.kind === "column") {
      checks.push(output.date.format === expected.dateFormat);
    }
    if (output.amount.kind === "magnitude_type") {
      if (expected.typeColumn) {
        checks.push(output.amount.typeColumn.toLowerCase() === expected.typeColumn.toLowerCase());
      }
      if (expected.magnitudeColumn) {
        checks.push(
          output.amount.magnitudeColumn.toLowerCase() === expected.magnitudeColumn.toLowerCase(),
        );
      }
      if (expected.debitValues) {
        const got = new Set(output.amount.debitValues.map((v) => v.toLowerCase()));
        const want = new Set(expected.debitValues.map((v) => v.toLowerCase()));
        const hit = [...want].filter((v) => got.has(v)).length;
        checks.push(hit === want.size);
      }
    }
    const passed = checks.filter(Boolean).length;
    return checks.length === 0 ? 1 : passed / checks.length;
  },
});

export const columnStructuralValidity = createScorer<unknown, CsvMappingAi, unknown>({
  description: "Required slots (merchant, amount, date) populated with non-empty values.",
  name: "Column Structural Validity",
  scorer: ({ output }) => {
    const haveMerchant = Boolean(output.merchant?.column);
    const haveAmount = Boolean(output.amount?.kind);
    const haveDate = Boolean(output.date?.kind);
    const passed = [haveMerchant, haveAmount, haveDate].filter(Boolean).length;
    return passed / 3;
  },
});

function classifyAccountAction(target: string): "link" | "create_new" | "skip" {
  if (target === "create_new") {
    return "create_new";
  }
  if (target === "skip") {
    return "skip";
  }
  return "link";
}

export const accountDecisionScorer = createScorer<unknown, AccountSuggestion[], AccountExpected>({
  description: "Per-label action + (when link) accountId + (when create) suggestedType match.",
  name: "Account Decisions",
  scorer: ({ output, expected }) => {
    if (!expected) {
      return 1;
    }
    const entries = Object.entries(expected.byLabel);
    if (entries.length === 0) {
      return 1;
    }
    let passed = 0;
    let total = 0;
    for (const [label, want] of entries) {
      const got = output.find((d) => d.sourceLabel === label);
      if (!got) {
        total += 1;
        continue;
      }
      const gotAction = classifyAccountAction(got.target);
      total += 1;
      if (gotAction === want.action) {
        passed += 1;
      }
      if (want.action === "link" && want.accountId) {
        total += 1;
        if (got.target === want.accountId) {
          passed += 1;
        }
      }
      if (want.action === "create_new" && want.suggestedType) {
        total += 1;
        if (got.suggestedType === want.suggestedType) {
          passed += 1;
        }
      }
      if (want.action === "create_new" && want.suggestedSubtype) {
        total += 1;
        if (got.suggestedSubtype?.toLowerCase().includes(want.suggestedSubtype.toLowerCase())) {
          passed += 1;
        }
      }
    }
    return total === 0 ? 1 : passed / total;
  },
});

export const categoryDecisionScorer = createScorer<unknown, CategorySuggestion[], CategoryExpected>(
  {
    description: "Per-label action + targetCategoryId + newName fuzzy match.",
    name: "Category Decisions",
    scorer: ({ output, expected }) => {
      if (!expected) {
        return 1;
      }
      const entries = Object.entries(expected.byLabel);
      let passed = 0;
      let total = 0;
      for (const [label, want] of entries) {
        const got = output.find((d) => d.sourceLabel === label);
        total += 1;
        if (!got) {
          continue;
        }
        if (got.action === want.action) {
          passed += 1;
        }
        if (want.targetCategoryId !== undefined) {
          total += 1;
          if (got.targetCategoryId === want.targetCategoryId) {
            passed += 1;
          }
        }
      }
      return total === 0 ? 1 : passed / total;
    },
  },
);

// SRI-321: create-action removed from CSV import; users add categories from
// settings post-import. Scorers kept as no-ops to preserve eval call sites.
export const categoryCreateHasNewCategory = createScorer<unknown, CategorySuggestion[], unknown>({
  description: "Deprecated: create action no longer supported. Always 1.",
  name: "Create has newCategory",
  scorer: () => 1,
});

export const iconKeyReasonable = createScorer<unknown, CategorySuggestion[], unknown>({
  description: "Deprecated: create action no longer supported. Always 1.",
  name: "iconKey Reasonable",
  scorer: () => ({ metadata: { rationale: "no creates" }, score: 1 }),
});
