import { Sun02Icon, MoonIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";

import { AppPreview } from "@/components/landing/app-preview";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Cobalt — Personal Finance" },
      {
        content: "Track spending, investments, and subscriptions in one place.",
        name: "description",
      },
      {
        content: "app-id=6757945133",
        name: "apple-itunes-app",
      },
    ],
  }),
});

function LandingPage() {
  return (
    <main className="flex h-svh flex-col overflow-auto no-scrollbar">
      <Nav />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}

function Nav() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="text-lg font-semibold">Cobalt</span>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          <HugeiconsIcon
            icon={isDark ? Sun02Icon : MoonIcon}
            size={18}
            strokeWidth={2}
          />
        </Button>
        <Link
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          to="/login"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="flex flex-col items-center gap-10 py-16 text-center">
      <div className="flex flex-col items-center gap-6 px-6">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Talk to your money.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Track spending, investments, and subscriptions in one place. Cobalt
          connects your accounts and keeps everything in sync — automatically.
        </p>
        <Link
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
          to="/login"
        >
          Get started free
        </Link>
      </div>
      <div className="mx-auto h-[80vh] w-[90%]">
        <AppPreview />
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      description:
        "Connect all your bank accounts, cards, and investments in minutes.",
      title: "Unified accounts",
    },
    {
      description:
        "Never miss a bill. See every recurring charge in one calendar view.",
      title: "Subscription tracking",
    },
    {
      description:
        "AI-powered summaries and alerts so you stay on top of your money.",
      title: "Smart insights",
    },
  ];

  return (
    <section className="bg-muted/40 px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
        {features.map((f) => (
          <div className="rounded-xl border bg-background p-6" key={f.title}>
            <h3 className="mb-2 font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
      &copy; {new Date().getFullYear()} Cobalt. All rights reserved.
    </footer>
  );
}
