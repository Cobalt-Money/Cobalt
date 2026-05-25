import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";

import { AppearanceSection } from "@/components/settings/sections";

export const Route = createFileRoute("/_auth/settings/appearance")({
  component: AppearanceRoute,
});

function AppearanceRoute() {
  const { theme, setTheme } = useTheme();
  return <AppearanceSection setTheme={setTheme} theme={theme} />;
}
