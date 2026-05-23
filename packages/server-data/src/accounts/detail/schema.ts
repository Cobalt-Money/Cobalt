// Detail-endpoint schemas live in `_shared/schema.ts` (shared with list + credit-cards).
// This file kept for layout parity; re-exports the shared response schema.
export { bankAccountResponseSchema } from "../_shared/schema.js";
export type { BankAccountResponse } from "../_shared/schema.js";
