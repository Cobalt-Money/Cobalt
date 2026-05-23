import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { FinancialEventDetailPage } from "@/components/news/financial-event-detail-page";

export const Route = createFileRoute("/_auth/news/$eventId")({
  component: NewsEventDetailRoute,
  loader: ({ context, params }) => {
    context.zero.preload(queries.news.eventById({ eventId: params.eventId }), { ttl: "5m" });
  },
  staticData: { title: "Event" },
});

function NewsEventDetailRoute() {
  const { eventId } = Route.useParams();
  return <FinancialEventDetailPage eventId={eventId} />;
}
