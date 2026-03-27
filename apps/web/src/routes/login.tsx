import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/shell/site-header";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  staticData: { title: "Login" },
});

function RouteComponent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="no-scrollbar min-h-0 flex-1 overflow-auto" />
    </div>
  );
}
