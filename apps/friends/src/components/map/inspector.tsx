import { MAP_STYLES } from "./constants";
import type { Category, GlassStyle, StyleKey, TimeWindow } from "./types";
import { categoryIconSrc, categoryLabel } from "./utils";

export function InspectorSection({
  title,
  children,
  isLight,
  dividerClass,
  mutedClass,
}: {
  title: string;
  children: React.ReactNode;
  isLight: boolean;
  dividerClass: string;
  mutedClass: string;
}) {
  void isLight;
  return (
    <div className={`border-b px-4 py-3 ${dividerClass}`}>
      <div className={`mb-2 text-[11px] font-semibold uppercase tracking-wider ${mutedClass}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function SegmentedRow<T extends string | number>({
  options,
  value,
  onChange,
  activeBtn,
  idleBtn,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  activeBtn: string;
  idleBtn: string;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded px-2 py-1.5 text-sm font-semibold transition ${value === o.key ? activeBtn : idleBtn}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function InspectorPanel({
  timeWindow,
  onTimeWindow,
  onFlyToCity,
  friends,
  hiddenFriendIds,
  onToggleFriend,
  activeCategories,
  presentCategories,
  onToggleCategory,
  styleKey,
  onStyleKey,
  showSubway,
  onSubwayChange,
  glassStyle,
}: {
  timeWindow: TimeWindow;
  onTimeWindow: (w: TimeWindow) => void;
  onFlyToCity: (c: "nyc" | "sf") => void;
  friends: { id: string; label: string; isSelf: boolean; color: string }[];
  hiddenFriendIds: Set<string>;
  onToggleFriend: (id: string) => void;
  activeCategories: Set<Category> | null;
  presentCategories: Set<Category>;
  onToggleCategory: (c: Category) => void;
  styleKey: StyleKey;
  onStyleKey: (k: StyleKey) => void;
  showSubway: boolean;
  onSubwayChange: (v: boolean) => void;
  glassStyle: GlassStyle;
}) {
  const isLight = glassStyle.textClass === "text-black";
  const { style, textClass, dividerClass, mutedClass } = glassStyle;
  const activeBtn = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleBtn = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  const allCats = [...presentCategories].toSorted((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b)),
  );

  return (
    <div
      className={`absolute right-4 top-20 z-10 flex w-64 max-h-[calc(100vh-6rem)] flex-col overflow-y-auto rounded-2xl border [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] ${textClass} ${
        isLight
          ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
          : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
      }`}
      style={style}
    >
      <div className={`flex gap-1 border-b px-4 py-3 ${dividerClass}`}>
        <button
          type="button"
          onClick={() => onFlyToCity("nyc")}
          className={`flex-1 rounded px-2 py-1.5 text-sm font-semibold transition ${idleBtn}`}
        >
          NYC
        </button>
        <button
          type="button"
          onClick={() => onFlyToCity("sf")}
          className={`flex-1 rounded px-2 py-1.5 text-sm font-semibold transition ${idleBtn}`}
        >
          SF
        </button>
      </div>

      <InspectorSection
        title="Range"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <SegmentedRow<TimeWindow>
          options={[
            { key: 7, label: "7d" },
            { key: 30, label: "30d" },
            { key: 90, label: "90d" },
            { key: 0, label: "All" },
          ]}
          value={timeWindow}
          onChange={onTimeWindow}
          activeBtn={activeBtn}
          idleBtn={idleBtn}
        />
      </InspectorSection>

      <InspectorSection
        title="Categories"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <div className="flex flex-col gap-1">
          {allCats.map((c) => {
            const on = activeCategories === null || activeCategories.has(c);
            const label = categoryLabel(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => onToggleCategory(c)}
                className={`flex items-center justify-between rounded px-2 py-1 text-sm font-medium transition ${idleBtn} ${on ? "" : "opacity-40"}`}
                title={label}
              >
                <span className="flex items-center gap-2">
                  <img
                    src={categoryIconSrc(c)}
                    alt=""
                    aria-hidden
                    className="size-5 object-contain"
                  />
                  {label}
                </span>
                <span className="w-3 text-center opacity-80">{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      </InspectorSection>

      <InspectorSection
        title="Friends"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        {friends.length === 0 ? (
          <p className={`text-xs ${mutedClass}`}>No friends yet. Send an invite.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {friends.map((f) => {
              const on = !hiddenFriendIds.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onToggleFriend(f.id)}
                  className={`flex items-center justify-between rounded px-2 py-1 text-xs font-medium transition ${idleBtn} ${on ? "" : "opacity-40"}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: f.color,
                      }}
                    />
                    {f.label}
                    {f.isSelf ? <span className="opacity-60">(you)</span> : null}
                  </span>
                  <span className="w-3 text-center opacity-80">{on ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </InspectorSection>

      <InspectorSection
        title="Map Style"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <select
          value={styleKey}
          onChange={(e) => onStyleKey(e.target.value as StyleKey)}
          className={`w-full rounded px-2 py-1.5 text-sm font-medium ${idleBtn} ${isLight ? "bg-black/5" : "bg-white/5"} outline-none`}
        >
          {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => (
            <option key={key} value={key} className="bg-black text-white">
              {MAP_STYLES[key]?.label}
            </option>
          ))}
        </select>
      </InspectorSection>

      <InspectorSection
        title="Layers"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={showSubway}
            onClick={() => onSubwayChange(!showSubway)}
            className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-sm font-semibold transition ${idleBtn}`}
          >
            <span>NYC Subway</span>
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${(() => {
                if (showSubway) {
                  return "bg-emerald-500";
                }
                return isLight ? "bg-black/20" : "bg-white/20";
              })()}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                  showSubway ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        </div>
      </InspectorSection>
    </div>
  );
}
