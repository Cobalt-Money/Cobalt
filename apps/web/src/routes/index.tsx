import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-semibold text-2xl tracking-tight">Cobalt</h1>
      <p className="text-muted-foreground mt-2">
        App shell — add screens here when you are ready.
      </p>
      <p className="mt-4">
        <Link
          className="text-primary underline underline-offset-4"
          to="/dashboard"
        >
          Open dashboard (shadcn dashboard-01)
        </Link>
      </p>
    </div>
  );
}
