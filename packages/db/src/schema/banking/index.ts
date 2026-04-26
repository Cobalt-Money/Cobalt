// Canonical banking exports.
//
// Pre-SRI-264 tables (bankAccount, bankBalance, bankBalanceSnapshot,
// bankConnection, transaction, recurringStream, investment*, *Liability)
// have moved to ../_deprecated/. Do not add new exports here for legacy
// tables — the _deprecated/ folder is scheduled for removal after the next
// release cycle. New code should import from schema/accounts/* instead.

// items — `institution.ts` (Drizzle) + `zod.ts` (jsonb)
export {
  institutionJsonbSelectRefinements,
  stringArrayJsonSchema,
} from "./items/zod";
export { institution } from "./items/institution";
export type { StringArrayJson } from "./items/zod";
export type { Institution, InstitutionSelect } from "./items/institution";
