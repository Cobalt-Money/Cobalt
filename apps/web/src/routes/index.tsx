import { Link, createFileRoute } from "@tanstack/react-router";

import { ApiSection } from "@/components/landing/api-section";
import { AppPreview } from "@/components/landing/app-preview";
import { Container, MarketingFooter, MarketingNav } from "@/components/landing/marketing-shell";
import { MobileAppPreview } from "@/components/landing/mobile-app-preview";
import { MobileSection } from "@/components/landing/mobile-section";
import { SurfaceSwitcher } from "@/components/landing/surface-switcher";
import { Cursor, CursorProvider } from "@/components/ui/cursor";

import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => {
    const seo = buildSeoMeta({ path: "/" });
    return {
      links: [
        { href: "https://fonts.googleapis.com", rel: "preconnect" },
        {
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0,1&family=Figtree:wght@300..900&display=swap",
          rel: "stylesheet",
        },
        ...seo.links,
      ],
      meta: [...seo.meta, { content: "app-id=6757945133", name: "apple-itunes-app" }],
      scripts: [
        {
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            logo: "https://cobaltpf.com/og-image.png",
            name: "Cobalt",
            url: "https://cobaltpf.com",
          }),
          type: "application/ld+json",
        },
      ],
    };
  },
});

function LandingStyles() {
  return (
    <style>{`
      body, main { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
      .font-display { font-family: 'Instrument Serif', serif; }
    `}</style>
  );
}

function LandingPage() {
  return (
    <>
      <LandingStyles />
      <main className="flex h-svh flex-col overflow-auto no-scrollbar">
        <MarketingNav />
        <Hero />
        <IntegrationsSection />
        <ApiSection />
        <MobileSection />
        <FinalCTA />
        <MarketingFooter />
      </main>
    </>
  );
}

function Hero() {
  return (
    <section className="py-20">
      <Container className="flex flex-col gap-16">
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Talk to your money.
          </h1>
          <p className="text-2xl text-muted-foreground">
            Spend seconds on your finances, not Sundays.
          </p>
        </div>
        <div className="sm:hidden">
          <MobileAppPreview />
        </div>
        <CursorProvider className="hidden w-full sm:block sm:h-[80vh]">
          <Cursor className="pointer-events-none hidden lg:block">
            <svg
              className="size-7 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 40 40"
            >
              <path
                fill="currentColor"
                d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
              />
            </svg>
          </Cursor>
          <AppPreview />
        </CursorProvider>
      </Container>
    </section>
  );
}

function IntegrationsSection() {
  return (
    <section className="flex min-h-screen flex-col justify-center border-t px-6 py-24 lg:py-32">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Own your financial data.
            <br />
            Use it anywhere.
          </h2>
        </div>
        <SurfaceSwitcher />
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t px-6 py-28 text-center lg:py-36">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-7">
        <h2 className="font-display text-5xl italic tracking-tight sm:text-6xl lg:text-7xl">
          Ready to talk
          <br />
          to your money?
        </h2>
        <p className="text-lg text-muted-foreground">
          Two minutes to connect an account. Cobalt takes it from there.
        </p>
        <Link
          className="rounded-md bg-primary px-8 py-4 font-medium text-primary-foreground hover:opacity-90"
          to="/login"
        >
          Get started free
        </Link>
      </div>
    </section>
  );
}
