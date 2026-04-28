import { plaidClient } from "@cobalt-web/clients/plaid";
import { env } from "@cobalt-web/env/server";
import { CountryCode, Products } from "plaid";

/** Create a Plaid link token for initial account connection. */
export async function createLinkToken(
  userId: string
): Promise<{ link_token: string }> {
  const response = await plaidClient.linkTokenCreate({
    client_name: "Cobalt",
    country_codes: [CountryCode.Us],
    language: "en",
    optional_products: [Products.Investments, Products.Liabilities],
    products: [Products.Transactions],
    user: { client_user_id: userId },
    webhook: env.PLAID_WEBHOOK_URL,
  });

  return { link_token: response.data.link_token };
}

/** Exchange a Plaid public token for an access token. */
export async function exchangePublicToken(
  publicToken: string
): Promise<{ access_token: string; item_id: string }> {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    access_token: response.data.access_token,
    item_id: response.data.item_id,
  };
}

/** Fetch item details and accounts in parallel. */
export async function fetchItemAndAccounts(accessToken: string) {
  const [itemGet, accountsGet] = await Promise.all([
    plaidClient.itemGet({ access_token: accessToken }),
    plaidClient.accountsGet({ access_token: accessToken }),
  ]);

  return { accounts: accountsGet.data.accounts, item: itemGet.data.item };
}

/** Trigger a Plaid sync to fire the webhook. */
export async function triggerPlaidSync(accessToken: string): Promise<void> {
  await plaidClient.transactionsSync({
    access_token: accessToken,
    count: 1,
    cursor: undefined,
  });
}

/** Remove a Plaid item. */
export async function removeItem(accessToken: string): Promise<void> {
  await plaidClient.itemRemove({ access_token: accessToken });
}

/** Fetch accounts for an item by access token. */
export async function fetchAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });
  return response.data.accounts;
}

/**
 * Create a link token for update mode (add-accounts, add-products, reauth).
 * Includes product fallback logic for additional_consented_products.
 */
export async function createLinkTokenForUpdate(
  accessToken: string,
  userId: string,
  mode: "add-accounts" | "add-products" | "reauth"
): Promise<{ link_token: string }> {
  const itemGet = await plaidClient.itemGet({ access_token: accessToken });
  const billedProducts = itemGet.data.item.billed_products ?? [];
  const hasInvestments = billedProducts.includes(Products.Investments);
  const hasLiabilities = billedProducts.includes(Products.Liabilities);

  const linkTokenParams: Parameters<typeof plaidClient.linkTokenCreate>[0] = {
    access_token: accessToken,
    client_name: "Cobalt",
    country_codes: [CountryCode.Us],
    language: "en",
    user: { client_user_id: userId },
    webhook: env.PLAID_WEBHOOK_URL,
  };

  if (mode === "add-accounts") {
    linkTokenParams.update = { account_selection_enabled: true };
  }

  const additionalProducts: Products[] = [];
  if (!hasInvestments) {
    additionalProducts.push(Products.Investments);
  }
  if (!hasLiabilities) {
    additionalProducts.push(Products.Liabilities);
  }

  return createLinkTokenWithProductFallback(
    linkTokenParams,
    additionalProducts
  );
}

/**
 * Try creating a link token with decreasing sets of additional products.
 * Falls back: full list → liabilities only → investments only → none.
 */
async function createLinkTokenWithProductFallback(
  baseParams: Parameters<typeof plaidClient.linkTokenCreate>[0],
  additionalProducts: Products[]
): Promise<{ link_token: string }> {
  const liabilitiesOnly = additionalProducts.filter(
    (p) => p === Products.Liabilities
  );
  const investmentsOnly = additionalProducts.filter(
    (p) => p === Products.Investments
  );

  const toTry: Products[][] = [];
  const seen = new Set<string>();
  for (const arr of [
    additionalProducts,
    liabilitiesOnly,
    investmentsOnly,
    [],
  ]) {
    const key = arr.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      toTry.push(arr);
    }
  }

  for (const [idx, products] of toTry.entries()) {
    const params = { ...baseParams } as Parameters<
      typeof plaidClient.linkTokenCreate
    >[0];
    if (products.length > 0) {
      params.additional_consented_products = products;
    } else {
      delete params.additional_consented_products;
    }

    try {
      const response = await plaidClient.linkTokenCreate(params);
      return { link_token: response.data.link_token };
    } catch (error) {
      const axiosErr = error as {
        response?: { data?: unknown; status?: number };
      };
      const status = axiosErr.response?.status;

      if (status === 400 && products.length > 0 && idx < toTry.length - 1) {
        continue;
      }

      const plaidMsg = formatPlaidError(axiosErr.response?.data);
      throw new Error(
        plaidMsg ||
          (error instanceof Error
            ? error.message
            : "Failed to create link token"),
        { cause: error }
      );
    }
  }

  throw new Error("Failed to create link token");
}

function formatPlaidError(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error_code" in body)) {
    return null;
  }
  const b = body as { error_code?: string; error_message?: string };
  if (b.error_code && b.error_message) {
    return `${b.error_code}: ${b.error_message}`;
  }
  return b.error_message ?? b.error_code ?? null;
}
