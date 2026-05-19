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
import { mutators } from "@cobalt-web/zero";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useZero } from "@rocicorp/zero/react";
import { useMatchRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

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
  const zero = useZero();

  const handleDelete = () => {
    if (!chatId) {
      return;
    }

    const wasOnDeletedChat = matchRoute({
      params: { chatId },
      to: "/ai-chat/$chatId",
    });

    // Fire the mutator. Client run updates the local replica sub-frame, so
    // the sidebar row and dialog disappear immediately. We surface errors
    // only if the server run rejects — optimistic UX.
    const { server } = zero.mutate(mutators.chats.delete({ chatId }));
    void (async () => {
      try {
        const result = await server;
        if (result.type === "error") {
          toast.error(result.error.message);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete chat");
      }
    })();

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
