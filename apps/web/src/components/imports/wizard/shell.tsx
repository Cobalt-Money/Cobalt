export function WizardShell({
  title,
  description,
  subtitle,
  children,
  headerAction,
}: {
  title: string;
  description?: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="flex max-h-[min(90vh,52rem)] flex-col">
      <div className="flex items-start justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="font-medium text-sm">{description || title}</div>
          {subtitle ? <div className="text-muted-foreground text-xs">{subtitle}</div> : null}
        </div>
        {headerAction}
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </div>
  );
}
