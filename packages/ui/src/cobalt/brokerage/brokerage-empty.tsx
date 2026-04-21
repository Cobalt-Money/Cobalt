import { ConnectAccountEmpty } from "@cobalt-web/ui/cobalt/empty/connect-account-empty";
import { ChartBarLineIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function BrokerageEmpty({ onConnect }: { onConnect?: () => void }) {
  return (
    <ConnectAccountEmpty
      className="min-h-[420px]"
      description="Link a brokerage or investment account to track your portfolio, positions, and activity in one place."
      icon={<HugeiconsIcon icon={ChartBarLineIcon} strokeWidth={1.5} />}
      onConnect={onConnect}
      title="Connect your brokerage"
    />
  );
}
