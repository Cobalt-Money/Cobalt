import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";
import { useOnReady } from "@/lib/providers/zero-client";

export const Route = createFileRoute("/_auth/research")({
  component: ResearchPage,
  staticData: { title: "Research" },
});

function ResearchPage() {
  const onReady = useOnReady();

  useEffect(() => {
    onReady();
  }, [onReady]);

  return <SidebarShellLayout />;
}
