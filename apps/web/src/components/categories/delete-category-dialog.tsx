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

import type { ManageCategoriesCat } from "@cobalt-web/ui/cobalt/transactions/categories/manage-categories-form";

import { useDeleteCategory } from "@/hooks/use-categories";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ManageCategoriesCat | null;
}

export function DeleteCategoryDialog({ open, onOpenChange, category }: Props) {
  const deleteCat = useDeleteCategory();

  const handleDelete = () => {
    if (!category) {
      return;
    }
    deleteCat(category.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category</AlertDialogTitle>
          <AlertDialogDescription>
            Delete{" "}
            <span className="font-medium text-foreground">{category?.name ?? "this category"}</span>
            ?
            <span className="mt-2 block">
              Existing transactions will be moved to <strong>Uncategorized</strong>. This cannot be
              undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button disabled={!category} onClick={handleDelete} type="button" variant="destructive">
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
