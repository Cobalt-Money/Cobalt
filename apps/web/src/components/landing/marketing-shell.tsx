import {
  Cancel01Icon,
  Github01Icon,
  Menu01Icon,
  MoonIcon,
  Sun02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-6 2xl:max-w-[100rem] ${className}`}>
      {children}
    </div>
  );
}

export function MarketingNav() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 py-4 backdrop-blur-sm">
      <Container className="flex items-center justify-between">
        <Link className="text-xl font-medium" onClick={closeMenu} to="/">
          Cobalt
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-muted-foreground text-sm sm:flex">
            <Link className="transition-colors hover:text-foreground" hash="features" to="/">
              Features
            </Link>
            <a
              className="transition-colors hover:text-foreground"
              href="https://docs.cobaltpf.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              Docs
            </a>
            <Link className="transition-colors hover:text-foreground" to="/pricing">
              Pricing
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/privacy">
              Privacy
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/terms">
              Terms
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <a
              className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
              href="https://github.com/cobalt-pf"
              rel="noopener noreferrer"
              target="_blank"
            >
              <HugeiconsIcon icon={Github01Icon} size={18} strokeWidth={2} />
            </a>
            <Button
              className="hidden sm:inline-flex"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon icon={isDark ? Sun02Icon : MoonIcon} size={18} strokeWidth={2} />
            </Button>
            <Link
              className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={closeMenu}
              to="/login"
            >
              Sign in
            </Link>
            <Button
              aria-expanded={open}
              aria-label="Toggle menu"
              className="sm:hidden"
              onClick={() => setOpen((v) => !v)}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} size={20} strokeWidth={2} />
            </Button>
          </div>
        </div>
      </Container>
      {open ? (
        <Container className="sm:hidden">
          <nav className="mt-4 flex flex-col gap-1 border-t pt-4 text-sm">
            <Link
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              hash="features"
              onClick={closeMenu}
              to="/"
            >
              Features
            </Link>
            <a
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              href="https://docs.cobaltpf.com"
              onClick={closeMenu}
              rel="noopener noreferrer"
              target="_blank"
            >
              Docs
            </a>
            <Link
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={closeMenu}
              to="/pricing"
            >
              Pricing
            </Link>
            <Link
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={closeMenu}
              to="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={closeMenu}
              to="/terms"
            >
              Terms
            </Link>
            <div className="mt-2 flex items-center gap-2 border-t pt-3">
              <a
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                href="https://github.com/cobalt-pf"
                rel="noopener noreferrer"
                target="_blank"
              >
                <HugeiconsIcon icon={Github01Icon} size={18} strokeWidth={2} />
              </a>
              <Button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                size="icon"
                variant="ghost"
              >
                <HugeiconsIcon icon={isDark ? Sun02Icon : MoonIcon} size={18} strokeWidth={2} />
              </Button>
            </div>
          </nav>
        </Container>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="shrink-0 overflow-hidden border-t">
      <div className="mx-auto flex max-w-7xl items-end justify-between px-6 pt-12">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Cobalt. All rights reserved.
        </p>
      </div>
      <div
        aria-hidden="true"
        className="select-none text-center font-semibold tracking-tighter text-foreground"
        style={{ fontSize: "min(28vw, 28rem)", lineHeight: "0.85" }}
      >
        Cobalt
      </div>
    </footer>
  );
}
