import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { SettingsDialog } from "./settings-dialog";

type SettingsSection = "profile" | "appearance" | "billing";

interface SettingsDialogContextValue {
  openSettings: (section?: SettingsSection) => void;
}

const SettingsDialogContext = createContext<SettingsDialogContextValue | null>(
  null
);

export function useSettingsDialog(): SettingsDialogContextValue {
  const ctx = useContext(SettingsDialogContext);
  if (!ctx) {
    throw new Error(
      "useSettingsDialog must be used within SettingsDialogProvider"
    );
  }
  return ctx;
}

export function SettingsDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("profile");

  const openSettings = useCallback((next: SettingsSection = "profile") => {
    setSection(next);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSettings }), [openSettings]);

  return (
    <SettingsDialogContext.Provider value={value}>
      {children}
      <SettingsDialog
        defaultSection={section}
        onOpenChange={setOpen}
        open={open}
      />
    </SettingsDialogContext.Provider>
  );
}
