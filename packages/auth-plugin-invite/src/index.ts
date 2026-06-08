import type { BetterAuthPlugin } from "better-auth";
import { mergeSchema } from "better-auth/db";

import { PLUGIN_ID } from "./constants";
import { INVITE_ERROR_CODES } from "./error-codes";
import { inviteHooks } from "./hooks";
import {
  activateInviteRoute,
  createInviteRoute,
  declineInviteRoute,
  listInvitesRoute,
  listPendingInvitesRoute,
  revokeInviteRoute,
} from "./routes";
import { schema } from "./schema";
import type { InviteOptions, InviteRecord } from "./types";
import { resolveOptions } from "./utils";

export type {
  InviteOptions,
  InviteRecord,
  OnAcceptCallback,
  OnDeclineCallback,
  OnRevokeCallback,
} from "./types";
export { INVITE_ERROR_CODES } from "./error-codes";

/**
 * Decoupled invite primitive for Better Auth. Plugin owns the
 * token + cookie + hook + ledger lifecycle. Consumer plugs in the side
 * effect via `onAccept` — friendship row, family membership, project
 * collaborator add, etc.
 *
 * See `packages/auth-plugin-invite/README.md` for the design rationale and
 * use cases beyond Cobalt friends.
 */
export const invite = <O extends InviteOptions>(opts: O) => {
  const options = resolveOptions(opts);

  return {
    $ERROR_CODES: INVITE_ERROR_CODES,
    $Infer: {
      Invite: {} as InviteRecord,
    },
    endpoints: {
      activateInvite: activateInviteRoute(options),
      createInvite: createInviteRoute(options),
      declineInvite: declineInviteRoute(options),
      listInvites: listInvitesRoute(),
      listPendingInvites: listPendingInvitesRoute(),
      revokeInvite: revokeInviteRoute(options),
    },
    hooks: inviteHooks(options),
    id: PLUGIN_ID,
    schema: mergeSchema(schema, opts.schema),
  } satisfies BetterAuthPlugin;
};
