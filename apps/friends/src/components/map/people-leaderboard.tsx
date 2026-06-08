import type { Category, GlassStyle, PersonAgg } from "./types";
import { categoryIconSrc, categoryLabel } from "./utils";

export function PeopleLeaderboard({
  people,
  categories,
  glassStyle,
  selfId,
}: {
  people: PersonAgg[];
  categories: Set<Category> | null;
  glassStyle: GlassStyle;
  selfId: string | undefined;
}) {
  const { style, textClass, mutedClass, dividerClass } = glassStyle;
  // Surface every systemKey present in any person's byCat — categories prop
  // narrows to active filter when present.
  const presentInPeople = new Set<Category>();
  for (const p of people) {
    for (const k of Object.keys(p.byCat)) {
      if (categories === null || categories.has(k)) {
        presentInPeople.add(k);
      }
    }
  }
  const visibleCats = [...presentInPeople].toSorted((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b)),
  );
  const topOverall = people.toSorted((a, b) => b.total - a.total).slice(0, 10);

  const topByCat: {
    cat: Category;
    person: PersonAgg | null;
    amount: number;
  }[] = visibleCats.map((cat) => {
    let best: PersonAgg | null = null;
    let bestAmt = 0;
    for (const p of people) {
      const a = p.byCat[cat] ?? 0;
      if (a > bestAmt) {
        best = p;
        bestAmt = a;
      }
    }
    return { amount: bestAmt, cat, person: best };
  });

  return (
    <div className="absolute left-4 top-4 z-10 w-80 max-w-[calc(100vw-2rem)]">
      <div className={`rounded-2xl border ${textClass}`} style={style}>
        <div className={`border-b px-4 py-3 ${dividerClass}`}>
          <div className="text-base font-semibold">Crew leaderboard</div>
        </div>
        <div className={`border-b px-4 py-2 ${dividerClass}`}>
          {topOverall.map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 py-1.5">
              <div className={`w-5 text-center text-xs tabular-nums ${mutedClass}`}>#{i + 1}</div>
              <div className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.name}
                {p.userId === selfId && (
                  <span className={`ml-1 text-[11px] ${mutedClass}`}>(you)</span>
                )}
              </div>
              <div className="text-sm font-semibold tabular-nums">${p.total.toFixed(0)}</div>
            </div>
          ))}
          {topOverall.length === 0 && (
            <div className={`py-3 text-center text-sm ${mutedClass}`}>No data in range</div>
          )}
        </div>
        <div className="px-4 py-2">
          <div className={`mb-1 text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
            Category champions
          </div>
          {topByCat.map(({ cat, person, amount }) => (
            <div key={cat} className="flex items-center gap-2 py-1">
              <img
                src={categoryIconSrc(cat)}
                alt=""
                aria-hidden
                className="size-4 object-contain"
              />
              <span className="w-20 text-sm">{categoryLabel(cat)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {person ? person.name : <span className={mutedClass}>—</span>}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {amount > 0 ? `$${amount.toFixed(0)}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
