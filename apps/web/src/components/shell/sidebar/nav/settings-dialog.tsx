import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { useState } from "react";

import { SettingsGrid } from "@/components/settings/settings-grid";
import type { SettingsSection } from "@/components/settings/settings-grid";

export function SettingsDialog({
  open,
  onOpenChange,
  defaultSection = "profile",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: SettingsSection;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(defaultSection);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setActiveSection(defaultSection);
    }
    onOpenChange(next);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="top-[max(6rem,13svh)] flex h-[640px] w-[768px] max-w-[calc(100vw-2rem)] translate-y-0 flex-col gap-0 overflow-hidden border-0 bg-popover p-0 shadow-2xl ring-0 sm:max-w-3xl dark:bg-popover"
        overlayClassName="bg-black/25 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your profile, account, appearance, and billing.
          </DialogDescription>
        </DialogHeader>
        <SettingsGrid activeSection={activeSection} onSectionChange={setActiveSection} />
      </DialogContent>
    </Dialog>
  );
}
