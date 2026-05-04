import { cn } from "@cobalt-web/ui/lib/utils";
import type React from "react";

interface SidebarItem {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

interface SidebarContentProps {
  items?: SidebarItem[];
  variant?: "navigation" | "bookmarks" | "history" | "extensions";
  className?: string;
}

interface BrowserWindowProps {
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showSidebar?: boolean;
  sidebarPosition?: "left" | "right" | "top" | "bottom";
  variant?: "chrome" | "safari" | "generic";
  sidebarItems?: SidebarItem[];
}

function SidebarContent({
  items = [
    { active: true, label: "Dashboard" },
    { badge: "3", label: "Analytics" },
    { label: "Settings" },
    { label: "Profile" },
  ],
  className = "",
}: SidebarContentProps) {
  return (
    <div className={`p-3 space-y-1 ${className}`}>
      {items.map((item) => {
        const handleOnClick = item.onClick;
        return (
          <button
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer text-left",
              item.active
                ? "bg-primary/5 text-primary border border-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
            )}
            key={item.label}
            type="button"
            onClick={handleOnClick}
          >
            {item.icon && <div className="w-4 h-4 flex-shrink-0">{item.icon}</div>}
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <div className="bg-primary/5 text-primary text-xs px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                {item.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function BrowserWindow({
  children,
  className = "",
  size = "md",
  showSidebar = false,
  sidebarPosition = "left",
  sidebarItems,
}: BrowserWindowProps) {
  const sizeClasses = {
    "2xl": "h-[56rem] w-full",
    lg: "h-96 max-w-4xl",
    md: "h-80 max-w-2xl",
    sm: "h-64 max-w-sm",
    xl: "h-[32rem] max-w-6xl",
  };

  const sidebarSizes = {
    "2xl": "w-64",
    lg: "w-56",
    md: "w-48",
    sm: "w-32",
    xl: "w-64",
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border flex flex-col",
        "shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.05),_0px_1px_1px_0px_rgba(255,_252,_240,_0.5)_inset,_0px_0px_0px_1px_hsla(0,_0%,_100%,_0.1)_inset,_0px_0px_1px_0px_rgba(28,_27,_26,_0.5)]",
        "dark:shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.15),_0px_2px_4px_-2px_rgba(0,0,0,0.1)]",
        sizeClasses[size],
        className,
      )}
    >
      {showSidebar && sidebarPosition === "top" && (
        <div className="border-b border-foreground/5 bg-muted/20 h-16">
          <SidebarContent className="flex-row" items={sidebarItems} variant="navigation" />
        </div>
      )}

      <div className="flex flex-1 h-0">
        {showSidebar && sidebarPosition === "left" && (
          <div
            className={`border-r border-foreground/5 bg-muted/20 ${sidebarSizes[size]} flex-shrink-0 h-full`}
          >
            <SidebarContent items={sidebarItems} />
          </div>
        )}

        <div className="flex-1 relative min-w-0 h-full overflow-hidden">{children}</div>

        {showSidebar && sidebarPosition === "right" && (
          <div
            className={`border-l border-foreground/5 bg-muted/20 ${sidebarSizes[size]} flex-shrink-0 h-full`}
          >
            <SidebarContent items={sidebarItems} />
          </div>
        )}
      </div>

      {showSidebar && sidebarPosition === "bottom" && (
        <div className="border-t border-foreground/5 bg-muted/20 h-16">
          <SidebarContent className="flex-row" items={sidebarItems} variant="navigation" />
        </div>
      )}
    </div>
  );
}
