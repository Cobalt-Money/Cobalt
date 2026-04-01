import { zql } from "../schema.js";

/** UUID that never matches real rows — used when there is no authenticated user. */
export const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export function chatsForUser(userId: string) {
  return zql.chats.where("userId", userId).orderBy("updatedAt", "desc");
}
