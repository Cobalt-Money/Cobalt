import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/clients/auth-client";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  staticData: { title: "Pricing" },
});

const features = [
  "30-day free trial on annual - Cancel anytime",
  "AI-Powered Financial Guidance",
  "Document Hub - Secure storage & organization",
  "Account Aggregator - Unified financial view",
  "Brokerage Integration - Portfolio management",
  "News and Updates - Curated financial news",
  "Research Tools - Market analysis & insights",
  "Advanced security & encryption",
];

function signedInCtaButtonLabel(
  isSubscribing: boolean,
  isAnnual: boolean
): string {
  if (isSubscribing) {
    return "Redirecting…";
  }
  if (isAnnual) {
    return "Start 30-day free trial";
  }
  return "Subscribe monthly";
}

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const session = useAppSession();
  const isSignedIn = Boolean(session.data?.user);

  const monthlyPrice = 6.99;
  const annualPrice = 70;

  const handleSubscribe = async () => {
    const plan = isAnnual ? "cobalt-annual" : "cobalt-monthly";
    setIsSubscribing(true);
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
      setIsSubscribing(false);
    }
  };

  const currentPrice = isAnnual ? annualPrice : monthlyPrice;
  const currentPeriod = isAnnual ? "year" : "month";
  const savings = isAnnual ? "Save $13.88/year" : "";
  const visibleFeatures = isAnnual
    ? features
    : features.filter((_, i) => i !== 0);

  return (
    <section className="relative w-full h-svh overflow-y-auto flex flex-col items-center py-16 sm:py-20">
      <div className="w-full max-w-6xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold font-manrope mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Simple, transparent pricing
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground font-manrope max-w-2xl mx-auto">
            One plan with everything you need to take control of your financial
            life.
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4 bg-[#1F2023] border border-white/10 rounded-full p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isAnnual
                  ? "text-gray-400 hover:text-white"
                  : "bg-gradient-to-r from-yellow-400 to-orange-400 text-black"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isAnnual
                  ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-4xl">
            {/* Recommended Badge */}
            {isAnnual && (
              <div className="flex justify-center absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-400 text-white px-4 py-1 text-sm font-semibold rounded-full shadow-lg">
                  Most Popular
                </Badge>
              </div>
            )}

            {/* Card Content */}
            <div className="bg-[#1F2023] border border-white/10 rounded-3xl p-8 sm:p-10">
              {/* Horizontal Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Left Side - Pricing */}
                <div className="text-center lg:text-left">
                  {/* Plan Name */}
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-bold font-manrope text-white mb-2">
                      Cobalt
                    </h3>
                    <p className="text-muted-foreground font-manrope">
                      No card required!
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center lg:justify-start gap-2">
                      <span className="text-4xl sm:text-5xl font-bold  text-white">
                        ${currentPrice}
                      </span>
                      <span className="text-lg text-muted-foreground font-manrope">
                        /{currentPeriod}
                      </span>
                      {isAnnual && (
                        <span className="text-sm text-green-400 font-semibold ml-2">
                          {savings}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Cancel anytime, no hidden fees
                    </p>
                  </div>

                  {/* CTA Button */}
                  {isSignedIn ? (
                    <Button
                      className="w-full lg:w-auto bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-500 hover:to-orange-500 font-semibold py-3 text-base px-8 flex items-center justify-center gap-2"
                      disabled={isSubscribing}
                      onClick={handleSubscribe}
                      size="lg"
                    >
                      {signedInCtaButtonLabel(isSubscribing, isAnnual)}
                    </Button>
                  ) : (
                    <Link
                      className={buttonVariants({
                        className:
                          "w-full lg:w-auto bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-500 hover:to-orange-500 font-semibold py-3 text-base px-8 flex items-center justify-center gap-2",
                        size: "lg",
                      })}
                      to="/login"
                    >
                      {isAnnual
                        ? "Start 30-day free trial"
                        : "Subscribe monthly"}
                    </Link>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {isAnnual
                      ? "Free trial on annual plan—billed after 30 days."
                      : "No trial on monthly—billed $6.99 today."}
                  </p>
                </div>

                {/* Right Side - Features */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 font-manrope">
                    What's included:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleFeatures.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                        <span className="text-sm text-gray-300 font-manrope">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-12 sm:mt-16">
          <p className="text-sm text-muted-foreground font-manrope max-w-2xl mx-auto">
            Join thousands of users who trust Cobalt with their financial data.
            Bank-level security, enterprise-grade encryption, and 24/7
            monitoring.
          </p>
        </div>
      </div>
    </section>
  );
}
