const SIDEBAR_PRIVATE = [
  { active: true, emoji: "💰", label: "Personal finances" },
  { emoji: "📒", label: "Journal" },
  { emoji: "🎯", label: "2026 goals" },
  { emoji: "📚", label: "Reading list" },
];

const SIDEBAR_WORKSPACE = [
  { emoji: "🏠", label: "Home" },
  { emoji: "🗓️", label: "Weekly review" },
  { emoji: "💸", label: "Subscriptions" },
];

const PROPERTIES = [
  {
    label: "Owner",
    pillClass: "bg-[#e9e5e2] text-[#37352f] dark:bg-[#373737] dark:text-[#e8e8e8]",
    value: "Me",
  },
  {
    label: "Status",
    pillClass: "bg-[#fdecc8] text-[#7a5a1c] dark:bg-[#5a4520]/70 dark:text-[#f5d28f]",
    value: "In review",
  },
  { label: "Updated", pillClass: "", value: "Just now" },
];

export function NotionVisual() {
  return (
    <div
      className="mx-auto flex w-full max-w-[820px] overflow-hidden rounded-2xl border border-black/10 bg-white text-[#37352f] shadow-2xl dark:border-white/10 dark:bg-[#191919] dark:text-[#d4d4d4]"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-black/5 bg-[#f7f7f5] px-2 py-3 text-[13px] text-[#37352f] sm:flex dark:border-white/5 dark:bg-[#202020] dark:text-[#d4d4d4]">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
          <div className="flex size-5 items-center justify-center rounded-sm bg-[#37352f] text-[10px] font-semibold text-white dark:bg-[#e8e8e8] dark:text-[#191919]">
            S
          </div>
          <span className="flex-1 truncate text-[13px] font-medium">Sriket's Notion</span>
          <svg
            className="size-3 text-[#9b9a97]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" strokeLinecap="round" />
          </svg>
        </div>

        <div className="mt-2 flex flex-col gap-px">
          <SidebarRow icon={<SearchIcon />} label="Search" />
          <SidebarRow icon={<InboxIcon />} label="Inbox" badge="3" />
          <SidebarRow icon={<SettingsIcon />} label="Settings" />
        </div>

        <SidebarGroup title="Workspace" items={SIDEBAR_WORKSPACE} />
        <SidebarGroup title="Private" items={SIDEBAR_PRIVATE} />

        <div className="mt-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#9b9a97] hover:bg-black/5 dark:hover:bg-white/5">
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New page
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2 text-[12px] text-[#9b9a97] dark:border-white/5 dark:text-[#7e7e7e]">
          <span>Private</span>
          <span>/</span>
          <span className="text-[#37352f] dark:text-[#e8e8e8]">💰 Personal finances</span>
          <div className="ml-auto flex items-center gap-1.5">
            <TopBarBtn>Share</TopBarBtn>
            <TopBarIcon>
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TopBarIcon>
            <TopBarIcon>
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TopBarIcon>
            <TopBarIcon>
              <svg fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </TopBarIcon>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-5">
          <div className="select-none text-[44px] leading-none">💰</div>
          <h1 className="mt-2 font-bold text-[26px] leading-tight tracking-tight text-[#37352f] dark:text-[#e8e8e8]">
            Personal finances
          </h1>

          <div className="mt-3 flex flex-col gap-1 text-[11.5px]">
            {PROPERTIES.map((p) => (
              <div className="flex items-center gap-3" key={p.label}>
                <span className="w-16 text-[#9b9a97] dark:text-[#7e7e7e]">{p.label}</span>
                {p.pillClass ? (
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${p.pillClass}`}>
                    {p.value}
                  </span>
                ) : (
                  <span className="text-[#37352f] dark:text-[#d4d4d4]">{p.value}</span>
                )}
              </div>
            ))}
          </div>

          {/* Callout */}
          <div className="mt-4 flex gap-2.5 rounded-md border border-black/5 bg-[#f7f6f3] p-3 dark:border-white/5 dark:bg-[#2a2a2a]">
            <div className="text-[16px] leading-none">📈</div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-[#9b9a97] dark:text-[#7e7e7e]">
                Net worth
              </div>
              <div className="mt-0.5 font-semibold text-[18px] leading-tight text-[#37352f] dark:text-[#e8e8e8]">
                $184,302.55
              </div>
              <div className="text-[11px] text-[#16a34a] dark:text-[#4ade80]">
                +$4,210 vs last month
              </div>
            </div>
          </div>

          {/* Inline DB grid */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Spend", tone: "text-[#9b9a97]", val: "$3,840" },
              { label: "Income", tone: "text-[#16a34a] dark:text-[#4ade80]", val: "$8,200" },
              { label: "Saved", tone: "text-[#1d4ed8] dark:text-[#7fb3ff]", val: "$4,360" },
            ].map((c) => (
              <div
                className="rounded-md border border-black/5 bg-white p-2.5 dark:border-white/5 dark:bg-[#202020]"
                key={c.label}
              >
                <div className="text-[10px] text-[#9b9a97] dark:text-[#7e7e7e]">{c.label}</div>
                <div className={`font-semibold text-[13px] ${c.tone}`}>{c.val}</div>
              </div>
            ))}
          </div>

          {/* Slash hint */}
          <div className="mt-4 flex items-center gap-1.5 text-[11.5px] text-[#9b9a97] dark:text-[#7e7e7e]">
            <span className="inline-flex h-[16px] items-center justify-center rounded border border-black/10 px-1 font-mono text-[10px] text-[#37352f] dark:border-white/10 dark:text-[#d4d4d4]">
              /
            </span>
            Type{" "}
            <span className="font-mono text-[11px] text-[#37352f] dark:text-[#d4d4d4]">
              /cobalt
            </span>{" "}
            to embed a live balance, holding, or query.
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarGroup({
  title,
  items,
}: {
  title: string;
  items: { emoji: string; label: string; active?: boolean }[];
}) {
  return (
    <div className="mt-4 flex flex-col gap-px">
      <div className="px-2 pb-1 text-[11px] font-medium text-[#9b9a97] uppercase tracking-wider dark:text-[#7e7e7e]">
        {title}
      </div>
      {items.map((it) => (
        <div
          className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] ${
            it.active
              ? "bg-black/5 text-[#37352f] dark:bg-white/10 dark:text-[#e8e8e8]"
              : "text-[#37352f] hover:bg-black/5 dark:text-[#d4d4d4] dark:hover:bg-white/5"
          }`}
          key={it.label}
        >
          <span className="w-4 text-center text-[13px] leading-none">{it.emoji}</span>
          <span className="truncate">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function SidebarRow({
  icon,
  label,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-[#37352f] hover:bg-black/5 dark:text-[#d4d4d4] dark:hover:bg-white/5">
      <span className="flex size-4 items-center justify-center text-[#9b9a97]">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full bg-[#ef4444] px-1.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function TopBarBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="rounded px-2 py-1 text-[12px] text-[#37352f] hover:bg-black/5 dark:text-[#d4d4d4] dark:hover:bg-white/5"
      type="button"
    >
      {children}
    </button>
  );
}

function TopBarIcon({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="flex size-7 items-center justify-center rounded text-[#9b9a97] hover:bg-black/5 hover:text-[#37352f] dark:hover:bg-white/5 dark:hover:text-[#e8e8e8]"
      type="button"
    >
      <span className="size-[14px]">{children}</span>
    </button>
  );
}

function SearchIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
