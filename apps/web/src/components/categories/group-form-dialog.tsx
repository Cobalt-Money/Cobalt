import { Button } from "@cobalt-web/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { Icon } from "@cobalt-web/ui/components/icon";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import type { ManageCategoriesGroup } from "@cobalt-web/ui/cobalt/transactions/categories/manage-categories-form";

import { useCreateGroup, useUpdateGroup } from "@/hooks/use-categories";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ManageCategoriesGroup | null;
}

export function GroupFormDialog({ open, onOpenChange, initial }: Props) {
  const isEdit = Boolean(initial?.id);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();

  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initial?.name ?? "");
    let secondId = 0;
    const id = window.requestAnimationFrame(() => {
      secondId = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (secondId) {
        window.cancelAnimationFrame(secondId);
      }
    };
  }, [open, initial]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= 50;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    if (isEdit && initial) {
      updateGroup({ groupId: initial.id, name: trimmed });
    } else {
      createGroup(trimmed);
    }
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="min-h-[200px] w-[460px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon={Folder01Icon} size="md" />
            {isEdit ? "Edit group" : "New group"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <input
            aria-label="Group name"
            className="w-full min-w-0 cursor-text bg-transparent font-semibold text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Subscriptions, Travel, Bills…"
            ref={inputRef}
            value={name}
          />
        </DialogBody>
        <DialogFooter className="mt-auto pt-2">
          <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
            {isEdit ? "Save" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
