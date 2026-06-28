import { buttonVariants } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { getRouteApi } from "@tanstack/react-router";

import { Container, MarketingFooter, MarketingNav } from "@/components/landing/marketing-shell";
import { Link } from "@/components/links";

const rootRouteApi = getRouteApi("__root__");

export function NotFoundPage() {
  const { auth } = rootRouteApi.useRouteContext();
  const isSignedIn = Boolean(auth.user);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <MarketingNav />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <Container className="max-w-lg text-center">
          <p className="font-mono text-muted-foreground text-sm tabular-nums">404</p>
          <h1 className="mt-3 font-semibold text-3xl tracking-tight sm:text-4xl">Page not found</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            That URL doesn&apos;t match anything in Cobalt. Check the address or head back to a
            known page.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isSignedIn ? (
              <Link className={cn(buttonVariants({ size: "lg" }))} to="/home">
                Back to home
              </Link>
            ) : (
              <Link className={cn(buttonVariants({ size: "lg" }))} to="/">
                Go to homepage
              </Link>
            )}
            <Link
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              to={isSignedIn ? "/ai-chat" : "/login"}
            >
              {isSignedIn ? "Open AI chat" : "Sign in"}
            </Link>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </div>
  );
}
