import { Button } from "@cobalt-web/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cobalt-web/ui/components/empty";
import { ChartBarLineIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function BrokerageEmpty() {
  return (
    <Empty className="min-h-[420px] rounded-3xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={ChartBarLineIcon} strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>Connect your brokerage</EmptyTitle>
        <EmptyDescription>
          Link a brokerage or investment account to track your portfolio,
          positions, and activity in one place.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button">Connect account</Button>
      </EmptyContent>
    </Empty>
  );
}
