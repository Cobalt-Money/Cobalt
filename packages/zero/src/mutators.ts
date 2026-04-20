import { defineMutators } from "@rocicorp/zero";

import { chatsMutators } from "./chats/mutators.js";

export const mutators = defineMutators({
  chats: chatsMutators,
});
