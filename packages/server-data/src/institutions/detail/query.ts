import { getInstitutionById as getInstitutionByIdViaPlaid } from "../../providers/plaid/institutions/actions.js";
import type { InstitutionDetail } from "./schema.js";

/** Get an institution's detail from Plaid. Throws ApiError(502, "plaid_upstream_failed") on upstream failure. */
export function getInstitutionDetail(institutionId: string): Promise<InstitutionDetail> {
  return getInstitutionByIdViaPlaid(institutionId);
}
