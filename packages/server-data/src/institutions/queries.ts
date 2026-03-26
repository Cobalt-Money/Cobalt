import { db } from "@cobalt-web/db";

/** Get an institution from the local DB by Plaid institution ID. */
export async function getInstitutionByPlaidId(plaidInstitutionId: string) {
  return (
    (await db.query.institution.findFirst({
      where: { plaidInstitutionId: { eq: plaidInstitutionId } },
    })) ?? null
  );
}
