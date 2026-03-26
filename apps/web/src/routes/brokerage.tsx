import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/brokerage")({
  component: BrokeragePage,
});

function BrokeragePage() {
  return (
    <SidebarShellLayout
      description="Placeholder — wire up brokerage when ready."
      title="Brokerage"
    />
  );
}
