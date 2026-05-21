import { createFileRoute } from "@tanstack/react-router";

import { TryDemoButton } from "@/components/demo/try-demo-button";
import { ApiSection } from "@/components/landing/api-section";
import { AppPreview } from "@/components/landing/app-preview";
import { FaqSection } from "@/components/landing/faq-section";
import {
  FloatingIntegrations,
  MobileIntegrationsRow,
} from "@/components/landing/floating-integrations";
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
        <TransparencySection />
        <FaqSection />
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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Talk to your money.
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl md:text-2xl">
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
    <section className="relative flex flex-col justify-start gap-6 border-t px-4 py-16 sm:px-6 sm:py-24 lg:min-h-screen lg:justify-center lg:overflow-hidden lg:py-32">
      <FloatingIntegrations />
      <MobileIntegrationsRow position="top" />
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Own your financial data.
            <br />
            Use it anywhere.
          </h2>
        </div>
        <SurfaceSwitcher />
      </div>
      <MobileIntegrationsRow position="bottom" />
    </section>
  );
}

function TransparencySection() {
  return (
    <section className="border-t px-6 py-24 text-center lg:py-32">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-7">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          You deserve full transparency.
        </h2>
        <p className="text-base text-muted-foreground sm:text-lg">Cobalt is 100% open source.</p>
        <a
          aria-label="Cobalt on GitHub"
          className="inline-flex size-20 items-center justify-center rounded-full text-foreground transition-opacity hover:opacity-70"
          href="https://github.com/cobalt-pf"
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg
            aria-hidden="true"
            className="size-16"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.78-.25.78-.56v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.3-.51-1.47.11-3.07 0 0 .96-.31 3.15 1.17.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.19-1.48 3.15-1.17 3.15-1.17.63 1.6.24 2.77.12 3.07.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
        </a>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t px-6 py-28 text-center lg:py-36">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-7">
        <h2 className="font-display text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Ready to talk
          <br />
          to your money?
        </h2>
        <TryDemoButton size="lg" variant="default" />
      </div>
    </section>
  );
}
