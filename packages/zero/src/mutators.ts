import { defineMutators } from "@rocicorp/zero";

import { accountsMutators } from "./accounts/mutators.js";
import { chatsMutators } from "./chats/mutators.js";
import { tagsMutators } from "./tags/mutators.js";
import { transactionMutators } from "./transactions/mutators.js";

export const mutators = defineMutators({
  accounts: accountsMutators,
  chats: chatsMutators,
  tags: tagsMutators,
  transaction: transactionMutators,
});
