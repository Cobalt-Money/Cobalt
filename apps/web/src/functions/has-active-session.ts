import { createMiddleware, createServerFn } from "@tanstack/react-start";

import { authClient } from "@/lib/clients/auth-client";

const optionalAuthMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await authClient
    .getSession({
      fetchOptions: { headers: request.headers, throw: true },
    })
    .catch(() => null);
  return next({ context: { session } });
});

export const hasActiveSession = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(({ context }) => Boolean(context.session));
