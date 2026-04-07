import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

/**
 * Subscribes to brokerage data for the `/brokerage` route — accounts with relations,
 * flat positions, recent activities, and recent orders (SnapTrade-synced tables).
 */
export function useBrokerage() {
  const [accounts, accountsResult] = useQuery(queries.brokerage.accounts());
  const [positions, positionsResult] = useQuery(queries.brokerage.positions());
  const [recentActivities, activitiesResult] = useQuery(
    queries.brokerage.recentActivities()
  );
  const [recentOrders, ordersResult] = useQuery(
    queries.brokerage.recentOrders()
  );

  const isComplete =
    accountsResult.type === "complete" &&
    positionsResult.type === "complete" &&
    activitiesResult.type === "complete" &&
    ordersResult.type === "complete";

  return {
    accounts,
    isComplete,
    positions,
    recentActivities,
    recentOrders,
  };
}
