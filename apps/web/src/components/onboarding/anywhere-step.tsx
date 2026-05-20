import { AnywherePreview } from "./anywhere-preview";

export function AnywhereStep() {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
        Manage your finances from anywhere.
      </h1>
      <AnywherePreview />
    </div>
  );
}
