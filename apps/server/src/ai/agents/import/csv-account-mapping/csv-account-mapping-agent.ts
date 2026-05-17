import { env } from "@cobalt-web/env/server";
import { Output, generateText } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";

import { gatewayModel } from "../../../model-provider.js";

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
  /** Canonical institution display name (e.g. "Chase Bank"). */
  suggestedInstitutionName?: string;
  /** Bare domain for the institution's website (e.g. "chase.com") — used to render logo via Brandfetch. */
  suggestedInstitutionDomain?: string;
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
        newName: z.string().nullable(),
        sourceLabel: z.string(),
        // nullable not optional: model has to commit to a value (real or null),
        // can't silently omit. Anthropic structured-output respects required-with-null
        // far more reliably than `.optional()` for soft-required fields.
        suggestedInstitutionDomain: z.string().nullable(),
        suggestedInstitutionName: z.string().nullable(),
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
  model,
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
  /** Override model. Defaults to gateway primary. Used by tests. */
  model?: LanguageModel;
}): Promise<AccountSuggestion[]> {
  if (sourceLabels.length === 0) {
    return [];
  }
  if (!model && !env.AI_GATEWAY_API_KEY) {
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
  const result = await generateText({
    experimental_telemetry: {
      functionId: "csv-account-mapping-agent",
      isEnabled: true,
    },
    model: model ?? gatewayModel(PRIMARY_MODEL),
    output: Output.object({ schema }),
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
      "ALWAYS set EVERY field on every decision. For target='link', set newName=null but still fill suggestedType+suggestedSubtype consistent with the matched account. For target='skip', set newName=null and pick the most plausible type/subtype from the label. For target='create_new', set newName to the source label as-is.",
      "",
      "suggestedInstitutionName + suggestedInstitutionDomain are REQUIRED on every decision. Use null ONLY when the label clearly identifies no institution (e.g. 'Cash', 'Default', 'Other', 'Wallet', '-'). For ANY branded label — bank, card, brokerage, lender — fill both with your best guess, even at low confidence. Examples: 'Chase Bank' + 'chase.com', 'Bank of America' + 'bankofamerica.com', 'Wells Fargo' + 'wellsfargo.com', 'American Express' + 'americanexpress.com' (NOT 'amex.com'), 'Fidelity' + 'fidelity.com', 'Charles Schwab' + 'schwab.com', 'Vanguard' + 'vanguard.com', 'Robinhood' + 'robinhood.com', 'Citibank' + 'citi.com', 'Capital One' + 'capitalone.com', 'Discover' + 'discover.com', 'US Bank' + 'usbank.com', 'PNC' + 'pnc.com'. suggestedInstitutionDomain MUST be a bare hostname (no protocol, no path, no www.).",
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
  });

  console.log(
    "[csv-account-mapping-agent] decisions:",
    JSON.stringify(result.output.decisions, null, 2),
  );
  return result.output.decisions.map((d) => ({
    confidence: d.confidence,
    newName: d.newName ?? undefined,
    sourceLabel: d.sourceLabel,
    suggestedInstitutionDomain: d.suggestedInstitutionDomain ?? undefined,
    suggestedInstitutionName: d.suggestedInstitutionName ?? undefined,
    suggestedSubtype: d.suggestedSubtype,
    suggestedType: d.suggestedType,
    target: d.target as string,
  }));
}
