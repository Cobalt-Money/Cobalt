import { db } from "@cobalt-web/db";
import { institution } from "@cobalt-web/db/schema/banking";

/** Insert an institution into the local DB. Returns the new row. */
export async function insertInstitution(data: {
  logo: string | null;
  name: string;
  oauth: boolean;
  plaidInstitutionId: string;
  primaryColor: string | null;
  routingNumbers: string[];
  status: string | null;
  url: string | null;
}) {
  const [newInstitution] = await db
    .insert(institution)
    .values(data)
    .returning();

  if (!newInstitution) {
    throw new Error("Failed to insert institution");
  }
  return newInstitution;
}
