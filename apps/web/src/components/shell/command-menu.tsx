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
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** All top-level app routes (see `routeTree.gen.ts` / sidebar). */
const COMMAND_NAV_ROUTES: readonly {
  keywords?: string[];
  label: string;
  path:
    | "/"
    | "/accounts"
    | "/brokerage"
    | "/dashboard"
    | "/login"
    | "/research"
    | "/transactions";
}[] = [
  { keywords: ["index", "root"], label: "Home", path: "/" },
  { label: "Dashboard", path: "/dashboard" },
  { keywords: ["tx", "history"], label: "Transactions", path: "/transactions" },
  { keywords: ["invest", "trading"], label: "Brokerage", path: "/brokerage" },
  { keywords: ["bank"], label: "Accounts", path: "/accounts" },
  { keywords: ["books", "notes"], label: "Research", path: "/research" },
  { keywords: ["auth", "sign in"], label: "Login", path: "/login" },
];

/**
 * Global command palette — `CobaltCommandDialog` + `CobaltCommandPaletteRoot` + `CobaltCommandInput`.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

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

  const go = (to: (typeof COMMAND_NAV_ROUTES)[number]["path"]) => {
    setOpen(false);
    navigate({ to });
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    setOpen(false);
  };

  return (
    <CobaltCommandDialog
      description="Search for a page or action"
      onOpenChange={setOpen}
      open={open}
      showCloseButton={false}
      title="Command palette"
    >
      <CobaltCommandPaletteRoot>
        <CobaltCommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {COMMAND_NAV_ROUTES.map(({ keywords, label, path }) => (
              <CommandItem
                key={String(path)}
                keywords={keywords}
                onSelect={() => go(path)}
                value={`${label} ${path}`}
              >
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
                Toggle theme
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      </CobaltCommandPaletteRoot>
    </CobaltCommandDialog>
  );
}
