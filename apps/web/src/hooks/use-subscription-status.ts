import { useQuery } from "@tanstack/react-query";

import { subscriptionsApi } from "@/lib/clients/api-client";

export type SubscriptionSource = "stripe" | "appstore" | null;

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isLoading: boolean;
  subscriptionSource: SubscriptionSource;
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const res = await subscriptionsApi.index.$get();
      if (!res.ok) {
        return { hasActiveSubscription: false, subscriptionSource: null as SubscriptionSource };
      }
      const body = (await res.json()) as {
        hasActiveSubscription: boolean;
        subscriptionSource: SubscriptionSource;
      };
      return body;
    },
    queryKey: ["subscription-status"],
    staleTime: 60_000,
  });

  return {
    hasActiveSubscription: data?.hasActiveSubscription ?? false,
    isLoading,
    subscriptionSource: data?.subscriptionSource ?? null,
  };
}
