import { Card } from "@cobalt-web/ui/components/card";

const FLOATING_CARD_CHROME =
  "-translate-x-1/2 fixed top-4 left-1/2 z-50 bg-sidebar shadow-none dark:bg-sidebar";

export function PlaidOpeningCard({ label = "Opening Plaid…" }: { label?: string }) {
  return (
    <Card variant="subtle" className={`${FLOATING_CARD_CHROME} w-72 gap-2 p-3`}>
      <div className="h-5 text-center font-medium text-sm">{label}</div>
    </Card>
  );
}
