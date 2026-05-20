import {
  BankIcon,
  ChartLineData01Icon,
  Home04Icon,
  Money01Icon,
  PlusSignIcon,
  RobotIcon,
  SparklesIcon,
  Tag01Icon,
  WalletAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useEffect, useState } from "react";

type IconSvg = Parameters<typeof HugeiconsIcon>[0]["icon"];

export function CommandStep() {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
  const modLabel = isMac ? "⌘" : "Ctrl";
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const keys = new Set<string>();
      if (e.metaKey || e.ctrlKey) {
        keys.add("mod");
      }
      if (e.shiftKey) {
        keys.add("shift");
      }
      if (e.altKey) {
        keys.add("alt");
      }
      if (e.key) {
        keys.add(e.key.toLowerCase());
      }
      setPressed(keys);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        setHasTriggered(true);
      }
    };
    const up = () => setPressed(new Set());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
          Press{" "}
          <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 align-middle font-mono text-2xl">
            {modLabel}
          </kbd>{" "}
          +{" "}
          <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 align-middle font-mono text-2xl">
            K
          </kbd>{" "}
          to search and run actions.
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Supercharge your productivity without leaving your keyboard.
        </p>
      </div>

      <KeyboardVisual
        hintKeys={hasTriggered ? new Set() : new Set(["mod", "k"])}
        modLabel={modLabel}
        pressed={pressed}
      />

      <OnboardingPaletteDemo onOpenChange={setPaletteOpen} open={paletteOpen} />
    </div>
  );
}

// Visual-only palette for the onboarding demo. Items are deliberately stubs —
// selecting any of them just closes the dialog so we don't accidentally fire
// Plaid Link, navigate away mid-onboarding, or open AI chat before the user
// has connected accounts.
interface DemoItem {
  label: string;
  icon: IconSvg;
}
interface DemoGroup {
  group: string;
  items: DemoItem[];
}

const DEMO_COMMANDS: DemoGroup[] = [
  {
    group: "Quick actions",
    items: [
      { icon: WalletAdd01Icon, label: "Add account" },
      { icon: PlusSignIcon, label: "Add transaction" },
      { icon: Tag01Icon, label: "Add tag" },
    ],
  },
  {
    group: "Navigation",
    items: [
      { icon: Home04Icon, label: "Go to Home" },
      { icon: Money01Icon, label: "Go to Transactions" },
      { icon: ChartLineData01Icon, label: "Go to Brokerage" },
      { icon: BankIcon, label: "Go to Accounts" },
    ],
  },
  {
    group: "AI",
    items: [
      { icon: RobotIcon, label: "Ask AI a question" },
      { icon: SparklesIcon, label: "Summarize last month" },
      { icon: PlusSignIcon, label: "New chat" },
    ],
  },
];

function OnboardingPaletteDemo({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <CommandDialog onOpenChange={onOpenChange} open={open} title="Command palette">
      <Command>
        <CommandInput placeholder="Type a command or search..." variant="frameless" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {DEMO_COMMANDS.map((g) => (
            <CommandGroup heading={g.group} key={g.group}>
              {g.items.map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={() => onOpenChange(false)}
                  value={item.label}
                >
                  <HugeiconsIcon
                    aria-hidden
                    className="text-muted-foreground"
                    icon={item.icon}
                    strokeWidth={2}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

const KB_ROWS: readonly (readonly { code: string; label: string; w?: number }[])[] = [
  [
    { code: "`", label: "`" },
    { code: "1", label: "1" },
    { code: "2", label: "2" },
    { code: "3", label: "3" },
    { code: "4", label: "4" },
    { code: "5", label: "5" },
    { code: "6", label: "6" },
    { code: "7", label: "7" },
    { code: "8", label: "8" },
    { code: "9", label: "9" },
    { code: "0", label: "0" },
  ],
  [
    { code: "q", label: "Q" },
    { code: "w", label: "W" },
    { code: "e", label: "E" },
    { code: "r", label: "R" },
    { code: "t", label: "T" },
    { code: "y", label: "Y" },
    { code: "u", label: "U" },
    { code: "i", label: "I" },
    { code: "o", label: "O" },
    { code: "p", label: "P" },
  ],
  [
    { code: "a", label: "A" },
    { code: "s", label: "S" },
    { code: "d", label: "D" },
    { code: "f", label: "F" },
    { code: "g", label: "G" },
    { code: "h", label: "H" },
    { code: "j", label: "J" },
    { code: "k", label: "K" },
    { code: "l", label: "L" },
  ],
  [
    { code: "shift", label: "shift", w: 2 },
    { code: "z", label: "Z" },
    { code: "x", label: "X" },
    { code: "c", label: "C" },
    { code: "v", label: "V" },
    { code: "b", label: "B" },
    { code: "n", label: "N" },
    { code: "m", label: "M" },
  ],
];

function KeyboardVisual({
  hintKeys,
  modLabel,
  pressed,
}: {
  hintKeys: Set<string>;
  modLabel: string;
  pressed: Set<string>;
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-3">
      {KB_ROWS.map((row, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
        <div className="flex gap-1.5" key={idx}>
          {row.map((key) => (
            <Key
              hint={hintKeys.has(key.code)}
              key={key.code}
              label={key.label}
              pressed={pressed.has(key.code)}
              widthUnits={key.w ?? 1}
            />
          ))}
        </div>
      ))}
      <div className="flex gap-1.5">
        <Key
          hint={hintKeys.has("mod")}
          label={modLabel}
          pressed={pressed.has("mod")}
          widthUnits={1.5}
        />
        <Key label="space" pressed={false} widthUnits={6} />
        <Key
          hint={hintKeys.has("mod")}
          label={modLabel}
          pressed={pressed.has("mod")}
          widthUnits={1.5}
        />
      </div>
    </div>
  );
}

function Key({
  hint,
  label,
  pressed,
  widthUnits,
}: {
  hint?: boolean;
  label: string;
  pressed: boolean;
  widthUnits: number;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center justify-center rounded-md border font-mono text-xs transition-all duration-75",
        pressed
          ? "scale-95 border-foreground bg-foreground text-background shadow-inner"
          : "border-border bg-background text-muted-foreground",
        hint && !pressed && "animate-pulse border-foreground/60 text-foreground",
      )}
      style={{ flex: `${widthUnits} 0 0` }}
    >
      {label}
    </div>
  );
}
