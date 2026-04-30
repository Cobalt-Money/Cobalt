import type { AddTagFormValues } from "@cobalt-web/ui/cobalt/tags/add-tag-dialog";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { useCallback } from "react";

import { useCreateTag } from "@/hooks/use-tags";

/** Mutation + toast wrapper used by the command-palette `add-tag` sub-page. */
export function useAddTagSubmit() {
  const createTag = useCreateTag();

  const submit = useCallback(
    async (values: AddTagFormValues): Promise<void> => {
      try {
        await createTag.mutateAsync(values);
      } catch (error) {
        console.error("Failed to create tag", error);
        cobaltToast.error("Couldn't create tag. Please try again.");
        throw error;
      }
    },
    [createTag]
  );

  return { isPending: createTag.isPending, submit };
}
