import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cobalt-web/ui/components/alert-dialog";
import { Button } from "@cobalt-web/ui/components/button";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { ManageCategoriesGroup } from "@cobalt-web/ui/cobalt/transactions/categories/manage-categories-form";

import { useDeleteGroup } from "@/hooks/use-categories";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ManageCategoriesGroup | null;
  hasChildren: boolean;
}

export function DeleteGroupDialog({ open, onOpenChange, group, hasChildren }: Props) {
  const deleteGroup = useDeleteGroup();

  const handleDelete = () => {
    if (!group || hasChildren) {
      return;
    }
    deleteGroup(group.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete group</AlertDialogTitle>
          <AlertDialogDescription>
            Delete{" "}
            <span className="font-medium text-foreground">{group?.name ?? "this group"}</span>?
            {hasChildren ? (
              <span className="mt-2 block text-destructive">
                Move or delete its categories first.
              </span>
            ) : (
              <span className="mt-2 block">This cannot be undone.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            disabled={!group || hasChildren}
            onClick={handleDelete}
            type="button"
            variant="destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
