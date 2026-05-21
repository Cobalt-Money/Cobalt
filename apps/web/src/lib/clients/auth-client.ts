import { stripeClient } from "@better-auth/stripe/client";
import type { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  // Surfaces server-side additionalFields (onboardedAt, onboardingStep, lastSeenAt, isAnonymous)
  // to client typing — without this, updateUser({...}) and session.user.X are typed as `never`.
  plugins: [inferAdditionalFields<typeof auth>(), stripeClient({ subscription: true })],
});
