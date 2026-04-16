import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/research")({
  component: ResearchLayout,
});

function ResearchLayout() {
  return <Outlet />;
}
