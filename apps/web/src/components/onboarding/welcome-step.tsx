export function WelcomeStep({
  name,
  onChange,
  onSubmit,
}: {
  name: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-5 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-semibold text-3xl tracking-tight">Hey there</h1>
        <p className="max-w-sm text-muted-foreground">
          We're glad you're here. What should we call you?
        </p>
      </div>
      <input
        autoComplete="given-name"
        autoFocus
        className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-center text-base outline-none focus:border-foreground"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Your name"
        type="text"
        value={name}
      />
    </div>
  );
}
