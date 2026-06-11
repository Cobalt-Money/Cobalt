import type { GlassStyle, ViewMode } from "./types";

const OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "pins", label: "Transactions" },
  { key: "people", label: "People" },
  { key: "places", label: "Places" },
];

export function ViewTabs({
  viewMode,
  onViewMode,
  glassStyle,
}: {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  glassStyle: GlassStyle;
}) {
  const { dividerClass, textClass } = glassStyle;
  const isLight = textClass === "text-black";
  const activeBtn = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleBtn = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  return (
    <div className={`flex gap-1 border-b p-2 ${dividerClass}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onViewMode(o.key)}
          className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${viewMode === o.key ? activeBtn : idleBtn}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
