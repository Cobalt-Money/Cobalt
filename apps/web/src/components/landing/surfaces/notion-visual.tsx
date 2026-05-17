export function NotionVisual() {
  return (
    <div
      className="mx-auto w-full max-w-[680px] overflow-hidden rounded-2xl border border-black/10 bg-white text-[#37352f] shadow-2xl dark:border-white/10 dark:bg-[#191919] dark:text-[#d4d4d4]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif" }}
    >
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2.5 text-[12px] text-[#9b9a97] dark:border-white/10 dark:text-[#7e7e7e]">
        <span>🏠</span>
        <span>/</span>
        <span>Personal finances</span>
        <span>/</span>
        <span className="text-[#37352f] dark:text-[#e8e8e8]">Q1 review</span>
      </div>
      <div className="px-8 py-6">
        <div className="font-bold text-[28px] leading-tight text-[#37352f] dark:text-[#e8e8e8]">
          Q1 review
        </div>
        <div className="mt-1 text-[12px] text-[#9b9a97] dark:text-[#7e7e7e]">
          Last edited just now
        </div>
        <div className="mt-5 text-[14px] leading-relaxed">
          Pulled live from{" "}
          <span className="rounded bg-[#e3f2fd] px-1.5 py-0.5 text-[12px] text-[#1d4ed8] dark:bg-[#1f3a5f]/60 dark:text-[#7fb3ff]">
            @Cobalt
          </span>{" "}
          — updates whenever I open the page.
        </div>
        <div className="mt-5 rounded-md border border-black/10 bg-[#f7f6f3] p-4 dark:border-white/10 dark:bg-[#2a2a2a]">
          <div className="text-[11px] uppercase tracking-wider text-[#9b9a97] dark:text-[#7e7e7e]">
            Net worth
          </div>
          <div className="mt-1 font-semibold text-[24px] text-[#37352f] dark:text-[#e8e8e8]">
            $184,302.55
          </div>
          <div className="text-[12px] text-[#16a34a] dark:text-[#4ade80]">
            +$4,210 vs last month
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Spend", val: "$3,840" },
            { label: "Income", val: "$8,200" },
            { label: "Saved", val: "$4,360" },
          ].map((c) => (
            <div
              className="rounded-md border border-black/10 bg-[#f7f6f3] p-3 dark:border-white/10 dark:bg-[#2a2a2a]"
              key={c.label}
            >
              <div className="text-[11px] text-[#9b9a97] dark:text-[#7e7e7e]">{c.label}</div>
              <div className="font-semibold text-[16px] text-[#37352f] dark:text-[#e8e8e8]">
                {c.val}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-[13px] text-[#9b9a97] dark:text-[#7e7e7e]">
          Type{" "}
          <span className="font-mono text-[12px] text-[#37352f] dark:text-[#d4d4d4]">/cobalt</span>{" "}
          to embed a live balance, holding, or query.
        </div>
      </div>
    </div>
  );
}
