import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/clients/auth-client";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  staticData: { title: "Pricing" },
});

const MONTHLY_PRICE = 6.99;
const ANNUAL_PRICE = 70;
const ANNUAL_SAVINGS = +(MONTHLY_PRICE * 12 - ANNUAL_PRICE).toFixed(2);

const sharedFeatures = [
  "AI-powered financial guidance",
  "Unlimited account aggregation",
  "Brokerage integration & portfolio management",
  "Unlimited document hub storage",
  "Curated news, research, and market insights",
  "Priority email & chat support",
];

const annualExtra = "30-day free trial — cancel anytime";

function PricingPage() {
  const [subscribing, setSubscribing] = useState<
    "cobalt-monthly" | "cobalt-annual" | null
  >(null);
  const session = useAppSession();
  const isSignedIn = Boolean(session.data?.user);

  const handleSubscribe = async (plan: "cobalt-monthly" | "cobalt-annual") => {
    setSubscribing(plan);
    try {
      const { data, error } = await authClient.subscription.upgrade({
        cancelUrl: `${window.location.origin}/pricing`,
        plan,
        successUrl: `${window.location.origin}/dashboard`,
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

  return (
    <main className="flex h-svh flex-col overflow-auto no-scrollbar px-6 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10">
        <h1 className="text-center text-2xl font-medium tracking-tight sm:text-3xl">
          Pricing
        </h1>

        <div className="grid w-full gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl bg-muted/40 p-8 sm:p-10">
            <p className="text-sm text-muted-foreground">Monthly</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
                ${MONTHLY_PRICE}
                <span className="text-2xl font-semibold">/month</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Billed monthly. Cancel anytime.
            </p>

            <div className="mt-8">
              {isSignedIn ? (
                <Button
                  className="h-12 w-full rounded-full text-base"
                  disabled={subscribing !== null}
                  onClick={() => handleSubscribe("cobalt-monthly")}
                  variant="secondary"
                >
                  {subscribing === "cobalt-monthly"
                    ? "Redirecting…"
                    : "Subscribe monthly"}
                </Button>
              ) : (
                <Link
                  className={buttonVariants({
                    className: "h-12 w-full rounded-full text-base",
                    variant: "secondary",
                  })}
                  to="/login"
                >
                  Subscribe monthly
                </Link>
              )}
            </div>

            <ul className="mt-8 space-y-4">
              {sharedFeatures.map((label) => (
                <li className="flex items-center gap-3 text-sm" key={label}>
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="size-4 flex-shrink-0 text-foreground"
                    strokeWidth={2.5}
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col rounded-3xl bg-muted/40 p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Annual</p>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Save ${ANNUAL_SAVINGS}/year
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
              <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
                ${ANNUAL_PRICE}
                <span className="text-2xl font-semibold">/year</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Billed annually. Cancel anytime.
            </p>

            <div className="mt-8">
              {isSignedIn ? (
                <Button
                  className="h-12 w-full rounded-full text-base"
                  disabled={subscribing !== null}
                  onClick={() => handleSubscribe("cobalt-annual")}
                >
                  {subscribing === "cobalt-annual"
                    ? "Redirecting…"
                    : "Start 30-day free trial"}
                </Button>
              ) : (
                <Link
                  className={buttonVariants({
                    className: "h-12 w-full rounded-full text-base",
                  })}
                  to="/login"
                >
                  Start 30-day free trial
                </Link>
              )}
            </div>

            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3 text-sm">
                <HugeiconsIcon
                  icon={Tick02Icon}
                  className="size-4 flex-shrink-0 text-foreground"
                  strokeWidth={2.5}
                />
                <span className="font-medium">{annualExtra}</span>
              </li>
              {sharedFeatures.map((label) => (
                <li className="flex items-center gap-3 text-sm" key={label}>
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="size-4 flex-shrink-0 text-foreground"
                    strokeWidth={2.5}
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="max-w-xl text-center text-xs text-muted-foreground">
          Bank-level security. Data encrypted at rest with AES-256 and in
          transit with TLS 1.2+.
        </p>
      </div>
    </main>
  );
}
