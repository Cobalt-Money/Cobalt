import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

/** Subscribes to brokerage data for `/brokerage` (SnapTrade-synced `brokerage_*` tables). */
export function useBrokerage() {
  const [accounts] = useQuery(queries.brokerage.accounts());
  const [positions] = useQuery(queries.brokerage.positions());
  const [recentActivities] = useQuery(queries.brokerage.recentActivities());

  return {
    accounts,
    positions,
    recentActivities,
  };
}
