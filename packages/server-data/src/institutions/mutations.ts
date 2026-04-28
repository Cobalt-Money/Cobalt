import { db } from "@cobalt-web/db";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";

export interface InstitutionUpsertInput {
  logo: string | null;
  name: string;
  oauth: boolean;
  plaidInstitutionId: string;
  primaryColor: string | null;
  routingNumbers: string[];
  status: string | null;
  url: string | null;
}

/** Insert an institution into the local DB. Returns the new row. */
export async function insertInstitution(data: InstitutionUpsertInput) {
  const [newInstitution] = await db
    .insert(institution)
    .values(data)
    .returning();

  if (!newInstitution) {
    throw new Error("Failed to insert institution");
  }
  return newInstitution;
}

/**
 * Insert or update an institution row keyed by Plaid institution ID. Used by
 * onboarding so `conn.institution.url` resolves for every newly linked item
 * (the mapper feeds that URL to Brandfetch/Logo.dev).
 */
export async function upsertInstitutionByPlaidId(
  data: InstitutionUpsertInput
): Promise<void> {
  await db
    .insert(institution)
    .values(data)
    .onConflictDoUpdate({
      set: {
        logo: data.logo,
        name: data.name,
        oauth: data.oauth,
        primaryColor: data.primaryColor,
        routingNumbers: data.routingNumbers,
        status: data.status,
        url: data.url,
      },
      target: institution.plaidInstitutionId,
    });
}
