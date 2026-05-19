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
import { useMatchRoute, useRouter } from "@tanstack/react-router";

import { useMutator } from "@/hooks/use-mutator";

interface DeleteChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  chatTitle: string | null;
  onDeleted?: () => void;
}

export function DeleteChatDialog({
  open,
  onOpenChange,
  chatId,
  chatTitle,
  onDeleted,
}: DeleteChatDialogProps) {
  const router = useRouter();
  const matchRoute = useMatchRoute();
  const run = useMutator();

  const handleDelete = () => {
    if (!chatId) {
      return;
    }

    const wasOnDeletedChat = matchRoute({
      params: { chatId },
      to: "/ai-chat/$chatId",
    });

    run((m) => m.chats.delete({ chatId }), "Failed to delete chat");

    if (wasOnDeletedChat) {
      router.navigate({ to: "/ai-chat" });
    }

    onOpenChange(false);
    onDeleted?.();
  };

  const displayTitle = chatTitle?.trim() || chatId || "this chat";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete chat</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this chat?
            <span className="mt-2 block truncate font-medium text-foreground">{displayTitle}</span>
            <span className="mt-2 block">
              This action cannot be undone and will permanently remove all messages in this chat.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button disabled={!chatId} onClick={handleDelete} type="button" variant="destructive">
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
