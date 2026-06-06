import type { auth } from "@cobalt-web/auth";
import { inviteClient } from "@cobalt-web/auth-plugin-invite/client";
import { env } from "@cobalt-web/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [inferAdditionalFields<typeof auth>(), inviteClient()],
});
