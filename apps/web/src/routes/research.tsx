import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <SidebarShellLayout
      description="Placeholder — wire up research when ready."
      title="Research"
    />
  );
}
