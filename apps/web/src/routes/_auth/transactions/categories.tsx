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
    <SidebarShellLayout>
      <div className="flex w-full flex-col gap-4 py-2 sm:gap-5 sm:py-3">
        <ManageCategoriesEmbedded />
      </div>
    </SidebarShellLayout>
  );
}
