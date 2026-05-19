import { NewsToolbar } from "@cobalt-web/ui/cobalt/news/news-toolbar";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";

import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

import { NewsLayoutProvider, useNewsLayout } from "./news-layout-context";

export const Route = createFileRoute("/_auth/news")({
  component: NewsLayout,
});

function NewsLayout() {
  return (
    <NewsLayoutProvider>
      <NewsLayoutInner />
    </NewsLayoutProvider>
  );
}

function NewsLayoutInner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNewsList = pathname === "/news" || pathname === "/news/";
  const { activeTab, setActiveTab } = useNewsLayout();

  return (
    <SidebarShellLayout
      flushBottom
      toolbar={
        isNewsList ? <NewsToolbar activeTab={activeTab} onTabChange={setActiveTab} /> : undefined
      }
    >
      <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </SidebarShellLayout>
  );
}
