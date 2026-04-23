import { stripeClient } from "@better-auth/stripe/client";
import { env } from "@cobalt-web/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [stripeClient({ subscription: true })],
});
