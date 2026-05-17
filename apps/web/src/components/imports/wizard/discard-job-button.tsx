import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cobalt-web/ui/components/alert-dialog";
import { Button } from "@cobalt-web/ui/components/button";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { importsApi } from "@/lib/clients/api-client";

import { useWizardContext } from "./context";

export function DiscardJobButton({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const { requestClose, setJobId } = useWizardContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await importsApi[":id"].$delete({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Failed to discard import");
      }
      return await res.json();
    },
    onError: (e) => cobaltToast.error(e instanceof Error ? e.message : "Discard failed"),
    onSuccess: async () => {
      cobaltToast.bulkSuccess("Import discarded");
      await qc.invalidateQueries({ queryKey: ["resumable-imports"] });
      setJobId(null);
      setConfirmOpen(false);
      requestClose();
    },
  });
  return (
    <>
      <Button
        aria-label="Discard import"
        disabled={deleteMut.isPending}
        onClick={() => setConfirmOpen(true)}
        size="icon-sm"
        variant="ghost"
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
      </Button>
      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this import?</AlertDialogTitle>
            <AlertDialogDescription>
              The uploaded CSV + any progress on this import will be permanently removed. No
              transactions are affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteMut.mutate();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
