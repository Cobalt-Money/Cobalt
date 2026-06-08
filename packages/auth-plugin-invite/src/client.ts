import type { BetterAuthClientPlugin } from "better-auth";

import { INVITE_ERROR_CODES } from "./error-codes";
import type { invite } from "./index";

export const inviteClient = () =>
  ({
    $ERROR_CODES: INVITE_ERROR_CODES,
    $InferServerPlugin: {} as ReturnType<typeof invite>,
    id: "invite",
    pathMethods: {
      "/invite/activate": "POST",
      "/invite/create": "POST",
      "/invite/decline": "POST",
      "/invite/list": "GET",
      "/invite/pending": "GET",
      "/invite/revoke": "POST",
    },
  }) satisfies BetterAuthClientPlugin;
