import { Switch } from "@cobalt-web/ui/components/switch";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { MarketingFooter, MarketingNav } from "@/components/landing/marketing-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/clients/auth-client";
import { useAppSession } from "@/lib/providers/app-session";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  staticData: { title: "Pricing" },
  head: () => {
    const seo = buildSeoMeta({
      title: "Pricing",
      description:
        "Simple Cobalt pricing — monthly or annual. Unlimited accounts, AI guidance, brokerage integration, and more.",
      path: "/pricing",
    });
    return { meta: seo.meta, links: seo.links };
  },
});

const MONTHLY_PRICE = 6.99;
const ANNUAL_PRICE = 70;
const ANNUAL_EFFECTIVE_MONTHLY = +(ANNUAL_PRICE / 12).toFixed(2);

const freeFeatures = [
  "Unlimited manual connections",
  "AI chat on Claude Haiku 4.5",
  "Use Cobalt from your favorite AI chatbot",
  "Curated news, research, and market insights",
];

const proFeatures = [
  "Unlimited synced bank + brokerage",
  "Claude Opus 4.7 + extended thinking",
  "Early access to new features",
];

function CheckBullet({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-foreground/15">
        <HugeiconsIcon className="size-3 text-background" icon={Tick02Icon} strokeWidth={3} />
      </span>
      <span>{label}</span>
    </li>
  );
}

function PricingPage() {
  const [yearly, setYearly] = useState(true);
  const [subscribing, setSubscribing] = useState<"cobalt-monthly" | "cobalt-annual" | null>(null);
  const session = useAppSession();
  const isSignedIn = Boolean(session.data?.user);

  const handleSubscribe = async (plan: "cobalt-monthly" | "cobalt-annual") => {
    setSubscribing(plan);
    try {
      const { data, error } = await authClient.subscription.upgrade({
        cancelUrl: `${window.location.origin}/pricing`,
        plan,
        successUrl: `${window.location.origin}/`,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to start checkout");
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("[pricing] subscribe failed", error);
      setSubscribing(null);
    }
  };

  const proPlan: "cobalt-monthly" | "cobalt-annual" = yearly ? "cobalt-annual" : "cobalt-monthly";
  const proPrice = yearly ? ANNUAL_EFFECTIVE_MONTHLY : MONTHLY_PRICE;

  return (
    <main className="flex h-svh flex-col overflow-auto no-scrollbar">
      <MarketingNav />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-20">
        <h1 className="font-semibold text-5xl tracking-tight sm:text-6xl md:pl-10">Pricing</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-border/40">
          {/* Free */}
          <div className="flex flex-col px-0 md:px-10">
            <h2 className="font-semibold text-2xl tracking-tight">Free</h2>
            <p className="mt-2 font-medium text-2xl">$0</p>
            <div className="my-6 h-px w-full bg-border/40" />
            <p className="text-muted-foreground text-sm">Free for everyone</p>
            <div className="my-6 h-px w-full bg-border/40" />
            <ul className="flex flex-col gap-4">
              {freeFeatures.map((label) => (
                <CheckBullet key={label} label={label} />
              ))}
            </ul>
            <div className="mt-10 flex-1" />
            <Link
              className={buttonVariants({
                className: "h-12 w-full rounded-full text-base",
                variant: "secondary",
              })}
              to={isSignedIn ? "/" : "/login"}
            >
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div className="mt-12 flex flex-col px-0 md:mt-0 md:px-10">
            <h2 className="font-semibold text-2xl tracking-tight">Pro</h2>
            <p className="mt-2 font-medium text-2xl">
              ${proPrice}{" "}
              <span className="font-normal text-base text-muted-foreground">
                {yearly ? "per month, billed yearly" : "per month"}
              </span>
            </p>
            <div className="my-6 h-px w-full bg-border/40" />
            <div className="flex items-center gap-3">
              <Switch checked={yearly} onCheckedChange={setYearly} />
              <span className="text-muted-foreground text-sm">
                Billed yearly{yearly ? ` ($${ANNUAL_PRICE}/yr)` : ""}
              </span>
            </div>
            <div className="my-6 h-px w-full bg-border/40" />
            <ul className="flex flex-col gap-4">
              <li className="flex items-center gap-3 font-medium text-sm">
                <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <HugeiconsIcon
                    className="size-3 text-primary"
                    icon={Tick02Icon}
                    strokeWidth={3}
                  />
                </span>
                <span>All Free features +</span>
              </li>
              {proFeatures.map((label) => (
                <CheckBullet key={label} label={label} />
              ))}
            </ul>
            <div className="mt-10 flex-1" />
            {isSignedIn ? (
              <Button
                className="h-12 w-full rounded-full text-base"
                disabled={subscribing !== null}
                onClick={() => handleSubscribe(proPlan)}
              >
                {subscribing === proPlan ? "Redirecting…" : "Get started"}
              </Button>
            ) : (
              <Link
                className={buttonVariants({
                  className: "h-12 w-full rounded-full text-base",
                })}
                to="/login"
              >
                Get started
              </Link>
            )}
          </div>
        </div>

        <p className="max-w-xl text-muted-foreground text-xs">
          Bank-level security. Data encrypted at rest with AES-256 and in transit with TLS 1.2+.
        </p>
      </div>
      <MarketingFooter />
    </main>
  );
}
