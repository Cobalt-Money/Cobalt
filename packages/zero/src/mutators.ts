import { defineMutators } from "@rocicorp/zero";

import { accountsMutators } from "./accounts/mutators.js";
import { brokerageMutators } from "./brokerage/mutators.js";
import { categoriesMutators } from "./categories/mutators.js";
import { chatsMutators } from "./chats/mutators.js";
import { tagsMutators } from "./tags/mutators.js";
import { transactionMutators } from "./transactions/mutators.js";

export const mutators = defineMutators({
  accounts: accountsMutators,
  brokerage: brokerageMutators,
  categories: categoriesMutators,
  chats: chatsMutators,
  tags: tagsMutators,
  transaction: transactionMutators,
});
