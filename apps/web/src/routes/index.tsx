import { createFileRoute } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/sidebar-shell-layout";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  staticData: { title: "Home" },
});

function HomeComponent() {
  return <SidebarShellLayout />;
}
