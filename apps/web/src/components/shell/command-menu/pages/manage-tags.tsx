import { Icon } from "@cobalt-web/ui/components/icon";
import { ManageTagsForm } from "@cobalt-web/ui/cobalt/transactions/tags/manage-tags-dialog";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { Tag01Icon } from "@hugeicons/core-free-icons";
import { useQuery as useZeroQuery } from "@rocicorp/zero/react";
import { queries } from "@cobalt-web/zero";
import { useMemo } from "react";

import { useDeleteTag, useUpdateTag } from "@/hooks/use-tags";

interface Props {
  /** Delegate to parent: switch to the add-tag sub-page (optionally pre-filled). */
  onRequestCreate: (initialName?: string) => void;
}

export function ManageTagsPage({ onRequestCreate }: Props) {
  const [allTags] = useZeroQuery(queries.tags.list());
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const manageTagsList = useMemo(
    () =>
      allTags
        .filter((t) => t.archivedAt === null && isTagColor(t.color))
        .map((t) => ({
          color: t.color as TagColor,
          count: t.transactionTags?.length ?? 0,
          id: t.id,
          name: t.name,
        })),
    [allTags],
  );

  return (
    <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
      <h2 className="flex items-center gap-2 font-semibold text-lg text-muted-foreground leading-none">
        <Icon className="shrink-0" icon={Tag01Icon} size="md" />
        Manage tags
      </h2>
      <ManageTagsForm
        onDelete={(tagId) => {
          deleteTag.mutate(tagId);
        }}
        onRecolor={(tagId, color) => {
          updateTag.mutate({ body: { color }, tagId });
        }}
        onRename={(tagId, name) => {
          updateTag.mutate({ body: { name }, tagId });
        }}
        onRequestCreate={onRequestCreate}
        tags={manageTagsList}
      />
    </div>
  );
}
