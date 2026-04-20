import { defineMutators } from "@rocicorp/zero";

import { chatsMutators } from "./chats/mutators.js";
import { transactionMutators } from "./transactions/mutators.js";

export const mutators = defineMutators({
  chats: chatsMutators,
  transaction: transactionMutators,
});
