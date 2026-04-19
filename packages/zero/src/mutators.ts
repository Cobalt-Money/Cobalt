import { defineMutators } from "@rocicorp/zero";

import { transactionMutators } from "./transactions/mutators.js";

export const mutators = defineMutators({
  transaction: transactionMutators,
});
