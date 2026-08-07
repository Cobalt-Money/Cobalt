import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { toErrorMessage } from "@cobalt-web/ui/lib/errors";
import { cn } from "@cobalt-web/ui/lib/utils";

import { Link } from "@/components/links";

/**
 * App-level error fallback, wired as the router's `defaultErrorComponent`.
 * Kept dependency-light (no route context, no marketing shell) so it can
 * render even when the root route itself failed.
 */
export function ErrorPage({ error, reset }: { error: unknown; reset?: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-20 text-center text-foreground">
      <p className="font-mono text-muted-foreground text-sm">Error</p>
      <h1 className="mt-3 font-semibold text-3xl tracking-tight sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-lg text-muted-foreground leading-relaxed">
        Cobalt hit an unexpected error rendering this page. Reloading usually fixes it — if it keeps
        happening, let us know.
      </p>
      {import.meta.env.DEV ? (
        <p className="mt-4 max-w-lg break-all font-mono text-muted-foreground/70 text-xs">
          {toErrorMessage(error)}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => {
            reset?.();
            window.location.reload();
          }}
          size="lg"
          type="button"
        >
          Reload page
        </Button>
        <Link className={cn(buttonVariants({ size: "lg", variant: "outline" }))} to="/home">
          Back to home
        </Link>
      </div>
    </main>
  );
}
