import { useState } from "react";

import { SettingsGrid } from "@/components/settings/settings-grid";
import type { SettingsSection } from "@/components/settings/settings-grid";

interface Props {
  /** Section to open on mount. */
  initialSection?: SettingsSection;
}

export function SettingsPage({ initialSection = "profile" }: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  return <SettingsGrid activeSection={activeSection} compact onSectionChange={setActiveSection} />;
}
