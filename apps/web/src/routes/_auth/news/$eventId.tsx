import { createFileRoute } from "@tanstack/react-router";

import { FinancialEventDetailPage } from "@/components/news/financial-event-detail-page";

export const Route = createFileRoute("/_auth/news/$eventId")({
  component: NewsEventDetailRoute,
});

function NewsEventDetailRoute() {
  const { eventId } = Route.useParams();
  return <FinancialEventDetailPage eventId={eventId} />;
}
