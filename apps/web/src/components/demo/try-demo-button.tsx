import { Button } from "@cobalt-web/ui/components/button";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useDemo } from "@cobalt-web/ui/hooks/use-demo";

/**
 * "Try the demo" CTA. Uses the unauthenticated `/api/demo/create` path so it's
 * safe to render on /login and the landing page.
 *
 * Hard-redirects after success so Zero and the auth client re-bootstrap under
 * the new session — soft navigation would keep stale providers around.
 */
export function TryDemoButton({
  size = "lg",
  variant = "outline",
}: {
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const { createAnonymous, pending } = useDemo();
  return (
    <Button
      disabled={pending}
      onClick={() => {
        void createAnonymous();
      }}
      size={size}
      type="button"
      variant={variant}
    >
      {pending ? (
        <>
          <Spinner className="size-4" />
          Loading demo…
        </>
      ) : (
        "Try the demo"
      )}
    </Button>
  );
}
