import { createFileRoute } from "@tanstack/react-router";

import { SubscriptionsCalendar } from "@/components/subscriptions/subscriptions-calendar";

export const Route = createFileRoute("/_auth/subscriptions/")({
  component: SubscriptionsPage,
  staticData: { title: "Subscriptions" },
});

function SubscriptionsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-4 pt-4 pb-10">
      <SubscriptionsCalendar />
    </div>
  );
}
