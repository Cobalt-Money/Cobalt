import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";

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
    <div className="flex w-full min-w-0 flex-col gap-4 bg-sidebar-inset px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {NEWS_TAB_DEFS.map((t) => (
          <CobaltToggle
            key={t.id}
            pressed={activeTab === t.id}
            onPressedChange={(pressed) => {
              if (pressed) {
                onTabChange(t.id);
              }
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {t.label}
          </CobaltToggle>
        ))}
      </div>
    </div>
  );
}
