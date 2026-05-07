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
      <DialogContent className="h-[640px] w-[768px] gap-0 p-0 sm:max-w-3xl" showCloseButton>
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
