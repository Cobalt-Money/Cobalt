import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { ManageCategoriesEmbedded } from "@/components/categories/manage-categories-container";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/transactions/categories")({
  component: CategoriesPage,
  loader: ({ context }) => {
    context.zero.run(queries.categories.listAll());
    context.zero.run(queries.categories.listGroups());
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
