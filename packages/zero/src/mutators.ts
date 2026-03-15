import { defineMutators } from "@rocicorp/zero";

// Add your mutators here using defineMutator
// Example:
//   myMutator: defineMutator(z.object({ id: z.string() }), async ({ tx, args }) => {
//     await tx.mutate.myTable.insert(args)
//   })

export const mutators = defineMutators({});
