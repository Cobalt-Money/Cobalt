import { BuildPreview } from "./build-preview";

export function BuildStep() {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
          Build your own finance apps.
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Use the Cobalt integration with your favorite AI tool.
        </p>
      </div>
      <BuildPreview />
    </div>
  );
}
