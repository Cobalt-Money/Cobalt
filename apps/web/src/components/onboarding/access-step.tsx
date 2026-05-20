import { ConnectPreview } from "./connect-preview";

export function AccessStep() {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
        Start by connecting your accounts
      </h1>
      <ConnectPreview />
    </div>
  );
}
