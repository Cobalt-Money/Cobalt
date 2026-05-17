import { Github01Icon, MoonIcon, Sun02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useTheme } from "next-themes";
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

  return (
    <header className="sticky top-0 z-50 bg-background/80 py-4 backdrop-blur-sm">
      <Container className="flex items-center justify-between">
        <Link className="text-xl" to="/">
          Cobalt
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-muted-foreground text-sm sm:flex">
            <Link className="transition-colors hover:text-foreground" hash="features" to="/">
              Features
            </Link>
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
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              href="https://github.com/cobalt-pf"
              rel="noopener noreferrer"
              target="_blank"
            >
              <HugeiconsIcon icon={Github01Icon} size={18} strokeWidth={2} />
            </a>
            <Button onClick={() => setTheme(isDark ? "light" : "dark")} size="icon" variant="ghost">
              <HugeiconsIcon icon={isDark ? Sun02Icon : MoonIcon} size={18} strokeWidth={2} />
            </Button>
            <Link
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              to="/login"
            >
              Sign in
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} Cobalt. All rights reserved.
    </footer>
  );
}
