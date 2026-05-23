import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { ManageCategoriesEmbedded } from "@/components/categories/manage-categories-container";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/transactions/categories")({
  component: CategoriesPage,
  loader: ({ context }) => {
    context.zero.preload(queries.categories.list({ includeHidden: true }), { ttl: "5m" });
    context.zero.preload(queries.categories.listGroups(), { ttl: "5m" });
  },
  staticData: { title: "Categories" },
});

function CategoriesPage() {
  return (
    <SidebarShellLayout flushBottom>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <ManageCategoriesEmbedded />
      </div>
    </SidebarShellLayout>
  );
}
