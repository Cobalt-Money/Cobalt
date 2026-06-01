import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

import { subscriptionsApi } from "@/lib/clients/api-client";

type ApiBody = InferResponseType<typeof subscriptionsApi.index.$get, 200>;

export type ConnectionState = ApiBody["connectionStates"][number];

const DEFAULT: ApiBody = {
  cancelAtPeriodEnd: false,
  connectionStates: [],
  hasActiveSubscription: false,
  periodEnd: null,
  status: null,
  subscriptionSource: null,
  tier: "free",
};

export function useSubscriptionStatus() {
  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const res = await subscriptionsApi.index.$get();
      return res.ok ? ((await res.json()) as ApiBody) : DEFAULT;
    },
    queryKey: ["subscription-status"],
    staleTime: 60_000,
  });

  return { ...(data ?? DEFAULT), isLoading };
}
