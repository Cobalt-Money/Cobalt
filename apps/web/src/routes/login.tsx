import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/shell/site-header";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  staticData: { title: "Login" },
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1" />
    </div>
  );
}
