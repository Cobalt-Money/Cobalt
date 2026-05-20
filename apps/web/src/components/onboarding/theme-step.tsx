import { cn } from "@cobalt-web/ui/lib/utils";
import { useTheme } from "next-themes";
import { useMemo } from "react";

export function ThemeStep() {
  const { theme, setTheme } = useTheme();
  const options = useMemo(
    () => [
      { id: "light" as const, label: "Light" },
      { id: "dark" as const, label: "Dark" },
    ],
    [],
  );

  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">Pick a theme</h1>
        <p className="text-muted-foreground">You can change this anytime in settings.</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg p-3 text-sm transition-colors",
                active
                  ? "border border-foreground bg-accent"
                  : "border border-transparent hover:border-foreground/40",
              )}
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              type="button"
            >
              <ThemeSwatch variant={opt.id} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeSwatch({ variant }: { variant: "light" | "dark" }) {
  const dark = variant === "dark";
  return (
    <div
      className={cn(
        "flex h-48 w-full flex-col overflow-hidden rounded-lg border shadow-sm",
        dark
          ? "border-zinc-800 bg-zinc-950 text-zinc-100"
          : "border-zinc-200 bg-white text-zinc-900",
      )}
    >
      {/* Chrome bar */}
      <div
        className={cn(
          "flex items-center gap-1 border-b px-2 py-1.5",
          dark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50",
        )}
      >
        <span className="size-1.5 rounded-full bg-red-400/80" />
        <span className="size-1.5 rounded-full bg-yellow-400/80" />
        <span className="size-1.5 rounded-full bg-green-400/80" />
      </div>
      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={cn(
            "flex w-10 shrink-0 flex-col gap-1 border-r p-1.5",
            dark ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-200 bg-zinc-50",
          )}
        >
          <span className={cn("h-1.5 w-full rounded-full", dark ? "bg-zinc-700" : "bg-zinc-300")} />
          <span className={cn("h-1.5 w-3/4 rounded-full", dark ? "bg-zinc-700" : "bg-zinc-300")} />
          <span className={cn("h-1.5 w-2/3 rounded-full", dark ? "bg-zinc-700" : "bg-zinc-300")} />
        </div>
        {/* Main */}
        <div className="flex flex-1 flex-col gap-1.5 p-2">
          <span className={cn("h-2 w-1/2 rounded-full", dark ? "bg-zinc-700" : "bg-zinc-300")} />
          <span className={cn("h-1.5 w-3/4 rounded-full", dark ? "bg-zinc-800" : "bg-zinc-200")} />
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <div className={cn("h-7 rounded-md", dark ? "bg-zinc-800" : "bg-zinc-100")} />
            <div className={cn("h-7 rounded-md", dark ? "bg-zinc-800" : "bg-zinc-100")} />
          </div>
        </div>
      </div>
    </div>
  );
}
