import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";

import { ApiSection } from "@/components/landing/api-section";
import { AppPreview } from "@/components/landing/app-preview";
import { FadeUp, LANDING_EASE as EASE } from "@/components/landing/fade-up";
import { HeroVideo } from "@/components/landing/hero-video";
import { LogoMarquee } from "@/components/landing/logo-marquee";
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
      <main className="relative flex flex-col">
        <MarketingNav overlay />
        <Hero />
        <PreviewSection />
        <LogoMarquee />
        <IntegrationsSection />
        <ApiSectionWithBg />
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
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { opacity: 1, y: 0 },
          initial: { opacity: 0, y: 16 },
          transition: { delay, duration: 0.9, ease: EASE },
        };
  return (
    <section className="relative h-screen overflow-hidden bg-[#222a1f]">
      <HeroVideo />
      <Container className="pointer-events-none relative z-10 flex h-full flex-col gap-6 pt-32 pb-20 [text-shadow:_0_1px_12px_rgba(0,0,0,0.3)]">
        <motion.h1
          className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          {...fade(0.1)}
        >
          Talk to your money
        </motion.h1>
        <motion.p
          className="max-w-2xl text-lg text-white/80 sm:text-xl md:text-2xl"
          {...fade(0.25)}
        >
          Spend seconds on your finances, not Sundays.
        </motion.p>
      </Container>
    </section>
  );
}

const PREVIEW_SECTION_BG = "/landing/preview-bg/mountains-bg.jpg";
const API_SECTION_BG = "/landing/preview-bg/oil-canvas.jpg";

function ApiSectionWithBg() {
  return (
    <div className="relative overflow-hidden" data-nav-surface="dark">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url(${API_SECTION_BG})` }}
      />
      <div aria-hidden className="-z-10 absolute inset-0 bg-black/35" />
      <ApiSection />
    </div>
  );
}

function PreviewSection() {
  const reduce = useReducedMotion();
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, scale: 0.94, y: 60 },
        transition: { duration: 1, ease: EASE },
        viewport: { amount: 0.25, once: true },
        whileInView: { opacity: 1, scale: 1, y: 0 },
      };
  return (
    <section className="relative overflow-hidden py-20 sm:py-28" data-nav-surface="dark">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url(${PREVIEW_SECTION_BG})` }}
      />
      <div aria-hidden className="-z-10 absolute inset-0 bg-black/35" />
      <Container className="relative flex flex-col gap-16">
        <motion.div
          className="mx-auto max-w-3xl text-center [text-shadow:_0_1px_12px_rgba(0,0,0,0.3)]"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          transition={{ duration: 0.7, ease: EASE }}
          viewport={{ amount: 0.8, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Financial Software designed for the most productive people.
          </h2>
        </motion.div>
        <motion.div className="sm:hidden" {...reveal}>
          <MobileAppPreview />
        </motion.div>
        <motion.div {...reveal} className="group relative hidden w-full sm:block">
          <div className="-translate-x-1/2 pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-y-1/2 opacity-100 transition-opacity duration-200 group-hover:opacity-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/5 backdrop-blur-xl backdrop-saturate-150">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              Click to interact
            </span>
          </div>
          <CursorProvider className="w-full sm:h-[80vh]">
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
        </motion.div>
      </Container>
    </section>
  );
}

function IntegrationsSection() {
  return (
    <section className="relative flex flex-col justify-start gap-6 px-4 py-16 sm:px-6 sm:py-24 lg:min-h-screen lg:justify-center lg:overflow-hidden lg:py-32">
      <FloatingIntegrations />
      <MobileIntegrationsRow position="top" />
      <div className="relative mx-auto w-full max-w-5xl">
        <FadeUp className="mb-10 text-center sm:mb-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Own your financial data.
            <br />
            Use it anywhere.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <SurfaceSwitcher />
        </FadeUp>
      </div>
      <MobileIntegrationsRow position="bottom" />
    </section>
  );
}

function TransparencySection() {
  return (
    <section className="px-6 py-24 text-center lg:py-32">
      <FadeUp className="mx-auto flex max-w-3xl flex-col items-center gap-7">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          You deserve full transparency.
        </h2>
        <p className="text-base text-muted-foreground sm:text-lg">Cobalt is 100% open source.</p>
        <motion.a
          aria-label="Cobalt on GitHub"
          className="inline-flex size-20 items-center justify-center rounded-full text-foreground"
          href="https://github.com/Cobalt-Money/Cobalt"
          rel="noopener noreferrer"
          target="_blank"
          transition={{ duration: 0.25, ease: EASE }}
          whileHover={{ rotate: -4, scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
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
        </motion.a>
      </FadeUp>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 py-28 text-center lg:py-36">
      <FadeUp className="mx-auto flex max-w-2xl flex-col items-center gap-7">
        <h2 className="font-semibold text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Ready to talk
          <br />
          to your money?
        </h2>
        <Link
          className="rounded-full bg-foreground px-6 py-3 text-base font-medium text-background hover:opacity-90"
          to="/login"
        >
          Sign in
        </Link>
      </FadeUp>
    </section>
  );
}
