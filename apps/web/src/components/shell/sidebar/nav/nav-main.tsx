import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const navItemClassName =
  "rounded-md px-2 py-1.5 text-[14px] text-muted-foreground data-active:text-foreground/85 [&_svg]:size-[15px]";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: ReactNode;
  }[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarGroup className="p-1.5">
      <SidebarGroupContent className="flex flex-col gap-1.5">
        <SidebarMenu className="gap-0">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className={navItemClassName}
                isActive={pathname === item.url}
                render={<Link aria-label={item.title} to={item.url} />}
                tooltip={item.title}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
