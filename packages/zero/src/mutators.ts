import { defineMutators } from "@rocicorp/zero";
import { transactionMutators } from "./transactions/mutators.js";
import { chatsMutators } from "./chats/mutators.js";

export const mutators = defineMutators({
  transaction: transactionMutators,
  chats: chatsMutators
});
