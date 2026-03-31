import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { SiteHeader } from "@/components/shell/site-header";
import { useOnReady } from "@/lib/providers/zero-client";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  staticData: { title: "Login" },
});

function RouteComponent() {
  const onReady = useOnReady();

  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="min-h-0 flex-1 overflow-auto no-scrollbar" />
    </div>
  );
}
