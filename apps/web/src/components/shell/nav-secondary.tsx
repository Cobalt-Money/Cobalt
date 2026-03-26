import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { sidebarNavItemClassName } from "./sidebar-nav-item-class";

export function NavSecondary({
  items,
  className,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: ReactNode;
  }[];
} & ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup className={cn("p-1.5", className)} {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className={sidebarNavItemClassName}
                render={
                  <a
                    aria-label={item.title}
                    href={item.url === "#" ? "/" : item.url}
                  />
                }
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
