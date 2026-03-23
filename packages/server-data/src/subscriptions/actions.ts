import { auth } from "@cobalt-web/auth";

/**
 * Creates a Stripe billing portal session for the given user via Better Auth's
 * stripe plugin (`auth.api.createBillingPortal`).
 *
 * Requires the `@better-auth/stripe` plugin to be configured on the auth instance.
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string,
  headers: Headers
): Promise<string> {
  const data = await auth.api.createBillingPortal({
    body: {
      referenceId: userId,
      returnUrl,
    },
    headers,
  });

  const url = data?.url;
  if (!url) {
    throw new Error("Failed to create Stripe billing portal session");
  }

  return url;
}
