import { env } from "@cobalt-web/env/server";
import { generateObject } from "ai";
import { z } from "zod";

import { gatewayModel } from "../../model-provider.js";

const PRIMARY_MODEL = "anthropic/claude-opus-4.7";

export type SuggestedAccountType = "depository" | "credit" | "investment" | "loan";

export interface AccountSuggestion {
  sourceLabel: string;
  /** Existing Cobalt accountId, or sentinel for create/skip flow. */
  target: string | "create_new" | "skip";
  /** Suggested initial name when target = "create_new". */
  newName?: string;
  /** Inferred account type for the create_new path. */
  suggestedType?: SuggestedAccountType;
  /** Inferred account subtype (e.g. "Checking", "Credit Card", "Roth IRA"). */
  suggestedSubtype?: string;
  confidence: number;
}

/**
 * Build the per-call AI schema for account label resolution. Output is
 * enum-constrained to actual user-account IDs + sentinels — invented IDs
 * fail zod parse (model can't hallucinate them past the boundary).
 */
function makeAccountLabelSchema(accountIds: string[]) {
  const values: [string, ...string[]] = ["create_new", "skip", ...accountIds];
  const targetEnum = z.enum(values);
  return z.object({
    decisions: z.array(
      z.object({
        confidence: z.number().min(0).max(1),
        newName: z.string().optional(),
        sourceLabel: z.string(),
        suggestedSubtype: z.string(),
        suggestedType: z.enum(["depository", "credit", "investment", "loan"]),
        target: targetEnum,
      }),
    ),
  });
}

/**
 * Per-label account suggestions. Pure agent: one Haiku call, zod-validated
 * against the user's actual account IDs. Caller owns cache lookup/persist.
 */
export async function runCsvAccountMappingAgent({
  sourceLabels,
  userAccounts,
}: {
  sourceLabels: string[];
  userAccounts: {
    customName: string | null;
    id: string;
    institutionName: string | null;
    mask: string | null;
    name: string;
    officialName: string | null;
    subtype: string | null;
    type: string;
  }[];
}): Promise<AccountSuggestion[]> {
  if (sourceLabels.length === 0) {
    return [];
  }
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  const ids = userAccounts.map((a) => a.id);
  const schema = makeAccountLabelSchema(ids.length > 0 ? ids : ["__none__"]);
  const accountSummary = userAccounts.map((a) => ({
    bestName: a.customName ?? a.officialName ?? a.name,
    id: a.id,
    institution: a.institutionName,
    mask: a.mask,
    subtype: a.subtype,
    type: a.type,
  }));
  const result = await generateObject({
    experimental_telemetry: {
      functionId: "csv-account-mapping-agent",
      isEnabled: true,
    },
    model: gatewayModel(PRIMARY_MODEL),
    prompt: [
      "Match each source-account label from a CSV import to one of the user's existing Cobalt accounts, OR create a new account, OR skip the label.",
      "",
      "Decision rules — apply in order:",
      "  1. STRONG MATCH only. To return an existing account id, the source label must clearly identify the same real-world account. Strong evidence: the label contains the institution name (or a well-known short form: 'Chase', 'BofA', 'WF', 'Amex') AND the type/subtype is consistent (e.g. 'Chase Checking' → a Chase depository account). Account-number masks matching is also strong.",
      "  2. WEAK MATCH or AMBIGUOUS → target='create_new'. Do NOT pick the first existing account just because something exists. If the source label mentions an institution the user does NOT have an account at (e.g. label='Chase Checking' but user only has Wells Fargo) → create_new with newName matching the source label.",
      "  3. NON-ACCOUNT LABELS → target='skip'. Examples: blank, '-', 'Summary', 'Total', 'Cleared', generic markers that aren't real accounts.",
      "",
      "Confidence guidance:",
      "  - 0.9+: institution name + type both match",
      "  - 0.7-0.9: institution match alone, type compatible",
      "  - 0.5-0.7: ambiguous label, weak signal — prefer create_new instead",
      "  - <0.5: don't return existing id, use create_new",
      "",
      "ALWAYS set suggestedType AND suggestedSubtype for every decision (including link/skip — for skip, just pick the most plausible type from the label). For create_new, also set newName to the source label as-is.",
      "",
      "Type/subtype inference rules:",
      "  - Credit cards: any well-known card product name (Amex Gold/Platinum/Green, Chase Sapphire/Freedom, Citi Double Cash, Capital One Venture, Discover It, etc.) → type='credit', subtype='Credit Card'. The word 'Card' or institution+product-line is also a credit signal.",
      "  - Checking/savings: 'Checking', 'Savings', 'HYSA', 'Money Market' → type='depository', subtype='Checking' / 'Savings' / 'Money Market' / 'CD' as appropriate.",
      "  - Brokerage / retirement: 'Brokerage', '401(k)', 'Roth IRA', 'Traditional IRA', 'HSA', 'Robinhood', 'Fidelity', 'Schwab', 'Vanguard' → type='investment', subtype='Brokerage' / 'Roth IRA' / 'Traditional IRA' / '401k' / 'HSA' as appropriate.",
      "  - Loans: 'Mortgage', 'Auto Loan', 'Student Loan', 'Personal Loan' → type='loan', subtype='Mortgage' / 'Auto Loan' / 'Student Loan' / 'Personal Loan'.",
      "  - When ambiguous (e.g. label is just an institution name with no product hint), default to type='depository', subtype='Checking' but lower the confidence to <0.7.",
      "",
      `Source labels: ${JSON.stringify(sourceLabels)}`,
      `User Cobalt accounts: ${JSON.stringify(accountSummary)}`,
    ].join("\n"),
    schema,
  });

  console.log(
    "[csv-account-mapping-agent] decisions:",
    JSON.stringify(result.object.decisions, null, 2),
  );
  return result.object.decisions.map((d) => ({
    confidence: d.confidence,
    newName: d.newName,
    sourceLabel: d.sourceLabel,
    suggestedSubtype: d.suggestedSubtype,
    suggestedType: d.suggestedType,
    target: d.target as string,
  }));
}
