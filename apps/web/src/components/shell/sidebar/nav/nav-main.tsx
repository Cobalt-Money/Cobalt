import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const navItemClassName =
  "rounded-md py-1.5 text-[13px] text-muted-foreground data-active:text-foreground/85 [&_svg]:size-[13px]";

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
        <SidebarMenu className="gap-0.5">
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
                className={navItemClassName}
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
