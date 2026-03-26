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

  const go = (to: string) => {
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
            <CommandItem onSelect={() => go("/")}>Home</CommandItem>
            <CommandItem onSelect={() => go("/dashboard")}>
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go("/login")}>Login</CommandItem>
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
