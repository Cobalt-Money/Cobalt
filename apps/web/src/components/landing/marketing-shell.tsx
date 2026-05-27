import { Cancel01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export function MarketingNav({ overlay = false }: { overlay?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [overDarkSurface, setOverDarkSurface] = useState(false);

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      setPastHero(overlay && y > window.innerHeight * 0.85);

      // Probe a few px below the nav for a section marked dark-surface.
      const probeY = 72;
      const probeX = window.innerWidth / 2;
      const el = document.elementFromPoint(probeX, probeY);
      const marked = el?.closest("[data-nav-surface]") as HTMLElement | null;
      setOverDarkSurface(marked?.dataset.navSurface === "dark");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [overlay]);

  const darkText = overlay && pastHero && !overDarkSurface;
  const textClass = darkText
    ? "text-foreground [&_a]:text-foreground [&_button]:text-foreground"
    : "text-white [&_a]:text-white [&_button]:text-white";
  const glassClass = darkText
    ? "bg-background/70 backdrop-blur-sm border-black/10"
    : "bg-white/5 backdrop-blur-sm border-white/10";
  let bgClass: string;
  if (overDarkSurface) {
    bgClass = "bg-white/5 backdrop-blur-sm border-white/10";
  } else if (scrolled || open) {
    bgClass = glassClass;
  } else {
    bgClass = "bg-transparent";
  }

  return (
    <header
      className={`${overlay ? "fixed inset-x-0 top-0" : "sticky top-0"} z-50 border-b border-transparent py-4 transition-colors duration-300 ${textClass} ${bgClass}`}
    >
      <Container className="flex items-center justify-between">
        <Link className="text-xl font-medium" onClick={closeMenu} to="/">
          Cobalt
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-muted-foreground text-sm sm:flex">
            <Link className="" hash="features" to="/">
              Features
            </Link>
            <a
              className=""
              href="https://docs.cobaltpf.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              Docs
            </a>
            <Link className="" to="/pricing">
              Pricing
            </Link>
            <Link className="" to="/blog">
              Blog
            </Link>
            <Link className="" to="/privacy">
              Privacy
            </Link>
            <Link className="" to="/terms">
              Terms
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium !text-zinc-800 hover:opacity-90"
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
            <Link className="rounded-md px-3 py-2" hash="features" onClick={closeMenu} to="/">
              Features
            </Link>
            <a
              className="rounded-md px-3 py-2"
              href="https://docs.cobaltpf.com"
              onClick={closeMenu}
              rel="noopener noreferrer"
              target="_blank"
            >
              Docs
            </a>
            <Link className="rounded-md px-3 py-2" onClick={closeMenu} to="/pricing">
              Pricing
            </Link>
            <Link className="rounded-md px-3 py-2" onClick={closeMenu} to="/blog">
              Blog
            </Link>
            <Link className="rounded-md px-3 py-2" onClick={closeMenu} to="/privacy">
              Privacy
            </Link>
            <Link className="rounded-md px-3 py-2" onClick={closeMenu} to="/terms">
              Terms
            </Link>
          </nav>
        </Container>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="shrink-0 border-t">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-3 gap-8 sm:grid-cols-4">
          <div className="col-span-3 sm:col-span-1">
            <p className="font-semibold text-foreground">Cobalt</p>
            <p className="mt-2 text-sm text-muted-foreground">Talk to your money.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  className="hover:text-foreground"
                  href="https://docs.cobaltpf.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Docs
                </a>
              </li>
              <li>
                <a
                  className="hover:text-foreground"
                  href="https://apps.apple.com/app/id6757945133"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  iOS app
                </a>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/login">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  className="hover:text-foreground"
                  href="https://github.com/Cobalt-Money/Cobalt"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a className="hover:text-foreground" href="mailto:hello@cobaltpf.com">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="hover:text-foreground" to="/terms">
                  Terms
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/privacy">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {year} Cobalt. All rights reserved.</p>
          <p>Open source under AGPL-3.0.</p>
        </div>
      </div>
    </footer>
  );
}
