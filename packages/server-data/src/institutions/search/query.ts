import { searchInstitutions as searchInstitutionsViaPlaid } from "../../providers/plaid/institutions/actions.js";
import type { InstitutionSearchResult } from "./schema.js";

/** Search institutions via Plaid. Throws ApiError(502, "plaid_upstream_failed") on upstream failure. */
export function searchInstitutions(query?: string): Promise<InstitutionSearchResult[]> {
  return searchInstitutionsViaPlaid(query);
}
