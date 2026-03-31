import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { useOnReady } from "@/lib/providers/zero-client";

export const Route = createFileRoute("/_auth/brokerage")({
  component: BrokeragePage,
  staticData: { title: "Brokerage" },
});

function BrokeragePage() {
  const onReady = useOnReady();

  useEffect(() => {
    onReady();
  }, [onReady]);

  return <SidebarShellLayout />;
}
