import { zql } from "../schema.js";

export { NO_MATCH_ID } from "../auth.js";

export function chatsForUser(userId: string) {
  return zql.chats.where("userId", userId).orderBy("updatedAt", "desc");
}
