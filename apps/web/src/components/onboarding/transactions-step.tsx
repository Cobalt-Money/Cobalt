import { TransactionsPreview } from "./transactions-preview";

export function TransactionsStep() {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
        Tag transactions, recategorize, and add notes.
      </h1>
      <TransactionsPreview />
    </div>
  );
}
