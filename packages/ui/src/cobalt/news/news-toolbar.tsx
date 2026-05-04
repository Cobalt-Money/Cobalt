import { cn } from "@cobalt-web/ui/lib/utils";

export const NEWS_TAB_DEFS = [
  { id: "general", label: "General" },
  { id: "for-you", label: "For You" },
  { id: "tech", label: "Tech" },
  { id: "government", label: "Government" },
  { id: "ai", label: "AI" },
  { id: "announcement", label: "Announcement" },
  { id: "earnings", label: "Earnings" },
] as const;

export type NewsTab = (typeof NEWS_TAB_DEFS)[number]["id"];

export function NewsToolbar({
  activeTab,
  onTabChange,
}: {
  activeTab: NewsTab;
  onTabChange: (v: NewsTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border/50 px-4 lg:px-6">
      {NEWS_TAB_DEFS.map((t, index) => {
        const isFirst = index === 0;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative py-2 text-sm font-medium transition-colors",
              isFirst ? "pl-0 pr-3" : "px-3",
              activeTab === t.id
                ? cn(
                    "text-foreground after:absolute after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground",
                    isFirst ? "after:left-0 after:right-3" : "after:inset-x-3",
                  )
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
