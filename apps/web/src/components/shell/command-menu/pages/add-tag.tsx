import { Icon } from "@cobalt-web/ui/components/icon";
import { AddTagForm } from "@cobalt-web/ui/cobalt/transactions/tags/add-tag-dialog";
import { Tag01Icon } from "@hugeicons/core-free-icons";
import { useCallback } from "react";

import { useAddTagSubmit } from "@/hooks/use-add-tag-submit";

interface Props {
  initialName: string;
  /** Fired after a successful submit. Parent decides whether to pop or close. */
  onSuccess: () => void;
  /** Backspace on empty input pops back. */
  onBackspaceWhenEmpty: () => void;
}

export function AddTagPage({ initialName, onSuccess, onBackspaceWhenEmpty }: Props) {
  const { isPending, submit } = useAddTagSubmit();

  const handleSubmit = useCallback(
    (values: Parameters<typeof submit>[0]) => {
      void (async () => {
        try {
          await submit(values);
          onSuccess();
        } catch {
          // Toast already shown by submit hook.
        }
      })();
    },
    [onSuccess, submit],
  );

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
        <Icon className="shrink-0" icon={Tag01Icon} size="md" />
        New Tag
      </h2>
      <AddTagForm
        initialName={initialName}
        onBackspaceWhenEmpty={onBackspaceWhenEmpty}
        onSubmit={handleSubmit}
        submitting={isPending}
      />
    </div>
  );
}
