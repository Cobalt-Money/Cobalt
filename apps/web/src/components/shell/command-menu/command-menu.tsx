import {
  CobaltCommandDialog,
  CobaltCommandInput,
  CobaltCommandPaletteRoot,
} from "@cobalt-web/ui/cobalt/command-palette";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@cobalt-web/ui/components/command";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  CreditCardIcon,
  Home04Icon,
  Moon02Icon,
  SearchDollarIcon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/** All top-level app routes — icons match {@link AppSidebar} `sidebarNav.navMain`. */
const COMMAND_NAV_ROUTES: readonly {
  icon: typeof Home04Icon;
  keywords?: string[];
  label: string;
  path:
    | "/accounts"
    | "/brokerage"
    | "/dashboard"
    | "/research"
    | "/transactions";
}[] = [
  { icon: Home04Icon, label: "Dashboard", path: "/dashboard" },
  {
    icon: ArrowReloadHorizontalIcon,
    keywords: ["tx", "history"],
    label: "Transactions",
    path: "/transactions",
  },
  {
    icon: AppleStocksIcon,
    keywords: ["invest", "trading"],
    label: "Brokerage",
    path: "/brokerage",
  },
  {
    icon: CreditCardIcon,
    keywords: ["bank"],
    label: "Accounts",
    path: "/accounts",
  },
  {
    icon: SearchDollarIcon,
    keywords: ["books", "notes"],
    label: "Research",
    path: "/research",
  },
];

interface CommandMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null);

export function useCommandMenu(): CommandMenuContextValue {
  const ctx = useContext(CommandMenuContext);
  if (!ctx) {
    throw new Error("useCommandMenu must be used within CommandMenuProvider");
  }
  return ctx;
}

function CommandMenuDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const go = useCallback(
    (to: (typeof COMMAND_NAV_ROUTES)[number]["path"]) => {
      onOpenChange(false);
      navigate({ to });
    },
    [navigate, onOpenChange]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    onOpenChange(false);
  }, [onOpenChange, resolvedTheme, setTheme]);

  const themeToggleIcon = resolvedTheme === "dark" ? Sun01Icon : Moon02Icon;

  return (
    <CobaltCommandDialog
      description="Search for a page or action"
      onOpenChange={onOpenChange}
      open={open}
      showCloseButton={false}
      title="Command palette"
    >
      <CobaltCommandPaletteRoot>
        <CobaltCommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {COMMAND_NAV_ROUTES.map(({ icon, keywords, label, path }) => (
              <CommandItem
                key={String(path)}
                keywords={keywords}
                onSelect={() => go(path)}
                value={`${label} ${path}`}
              >
                <HugeiconsIcon
                  aria-hidden
                  className="text-muted-foreground"
                  icon={icon}
                  strokeWidth={2}
                />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
          {themeReady ? (
            <CommandGroup heading="Settings">
              <CommandItem
                keywords={[
                  "appearance",
                  "color",
                  "dark",
                  "light",
                  "mode",
                  "theme",
                  "toggle",
                ]}
                onSelect={toggleTheme}
                value="theme-toggle"
              >
                <HugeiconsIcon
                  aria-hidden
                  className="text-muted-foreground"
                  icon={themeToggleIcon}
                  strokeWidth={2}
                />
                Toggle theme
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      </CobaltCommandPaletteRoot>
    </CobaltCommandDialog>
  );
}

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      <CommandMenuDialog onOpenChange={setOpen} open={open} />
    </CommandMenuContext.Provider>
  );
}

export function CommandMenuSearchShortcut() {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <KbdGroup
      aria-hidden
      className="pointer-events-none hidden shrink-0 gap-0.5 sm:inline-flex"
    >
      <Kbd className="min-w-6 px-1">{isMac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd className="min-w-6 px-1">K</Kbd>
    </KbdGroup>
  );
}
