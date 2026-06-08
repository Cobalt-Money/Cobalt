import { defineErrorCodes } from "@better-auth/core/utils/error-codes";

export const INVITE_ERROR_CODES = defineErrorCodes({
  ALREADY_REDEEMED: "You have already redeemed this invite",
  CANNOT_DECLINE_OWN_INVITE: "You cannot decline your own invite",
  CANNOT_REDEEM_OWN_INVITE: "You cannot redeem your own invite",
  INVITE_EXHAUSTED: "Invite has reached its maximum number of uses",
  INVITE_EXPIRED: "Invite has expired",
  INVITE_NOT_FOUND: "Invite token does not exist",
  INVITE_REVOKED: "Invite was revoked by the sender",
  MISSING_TARGET_FOR_PRIVATE_INVITE: "Private invite requires a target user id, email, or phone",
  NOT_INVITE_OWNER: "Only the inviter can revoke this invite",
  ON_ACCEPT_FAILED: "Invite was valid but the consumer-supplied onAccept side effect threw",
  WRONG_RECIPIENT: "This invite was sent to a different recipient",
});
