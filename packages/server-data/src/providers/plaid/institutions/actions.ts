import { plaidClient } from "@cobalt-web/clients/plaid";
import { CountryCode, Products } from "plaid";

import { ApiError } from "../../../_shared/api-error.js";

const plaidUpstreamError = (err: unknown, fallback: string) =>
  new ApiError(502, "plaid_upstream_failed", err instanceof Error ? err.message : fallback);

/** Fetch institution name and logo from Plaid. */
export async function fetchInstitutionDetails(
  institutionId: string,
): Promise<{ logo: string | null; name: string | null }> {
  try {
    const inst = await plaidClient.institutionsGetById({
      country_codes: [CountryCode.Us],
      institution_id: institutionId,
    });
    return {
      logo: inst.data.institution.logo ?? null,
      name: inst.data.institution.name ?? null,
    };
  } catch {
    return { logo: null, name: null };
  }
}

/** Search institutions from Plaid. */
export async function searchInstitutions(query?: string) {
  try {
    if (query && query.length > 0) {
      const response = await plaidClient.institutionsSearch({
        country_codes: [CountryCode.Us],
        options: { include_optional_metadata: true },
        products: [Products.Transactions],
        query,
      });
      return response.data.institutions.map((inst) => ({
        id: inst.institution_id,
        logo: inst.logo ?? null,
        name: inst.name,
        primary_color: inst.primary_color ?? null,
        url: inst.url ?? null,
      }));
    }

    const response = await plaidClient.institutionsGet({
      count: 9,
      country_codes: [CountryCode.Us],
      offset: 0,
      options: {
        include_optional_metadata: true,
        products: [Products.Transactions],
      },
    });
    return response.data.institutions.map((inst) => ({
      id: inst.institution_id,
      logo: inst.logo ?? null,
      name: inst.name,
      primary_color: inst.primary_color ?? null,
      url: inst.url ?? null,
    }));
  } catch (error) {
    throw plaidUpstreamError(error, "Failed to search institutions");
  }
}

/** Get institution details by ID from Plaid. */
export async function getInstitutionById(institutionId: string) {
  let response;
  try {
    response = await plaidClient.institutionsGetById({
      country_codes: [CountryCode.Us],
      institution_id: institutionId,
      options: { include_optional_metadata: true },
    });
  } catch (error) {
    throw plaidUpstreamError(error, "Failed to fetch institution");
  }

  const inst = response.data.institution;
  return {
    id: inst.institution_id,
    logo: inst.logo ?? null,
    name: inst.name,
    oauth: inst.oauth ?? false,
    primary_color: inst.primary_color ?? null,
    routing_numbers: inst.routing_numbers ?? [],
    status: inst.status ?? null,
    url: inst.url ?? null,
  };
}
