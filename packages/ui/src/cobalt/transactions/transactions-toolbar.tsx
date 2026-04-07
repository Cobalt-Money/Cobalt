import { CobaltToggle } from "@cobalt-web/ui/cobalt/toggle";
import { Button } from "@cobalt-web/ui/components/button";

export function TransactionsToolbar() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 bg-sidebar-inset px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CobaltToggle size="sm" type="button" variant="outline">
          Amount
        </CobaltToggle>
        <CobaltToggle size="sm" type="button" variant="outline">
          Status
        </CobaltToggle>
        <CobaltToggle size="sm" type="button" variant="outline">
          Bank
        </CobaltToggle>
      </div>
      <Button className="shrink-0" size="sm" type="button" variant="outline">
        Export
      </Button>
    </div>
  );
}
