/** Human-readable relative / absolute time for “last synced” labels. */
export function formatLastSyncedLabel(ms: number | null): string {
  if (ms === null) {
    return "—";
  }
  const diffMs = Date.now() - ms;
  if (diffMs < 0) {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(ms));
  }
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const sec = diffMs / 1000;
  if (sec < 60) {
    const s = Math.max(1, Math.round(sec));
    return rtf.format(-s, "second");
  }
  if (sec < 3600) {
    return rtf.format(-Math.round(sec / 60), "minute");
  }
  if (sec < 86_400) {
    return rtf.format(-Math.round(sec / 3600), "hour");
  }
  const day = Math.round(sec / 86_400);
  if (day < 14) {
    return rtf.format(-day, "day");
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(ms));
}

export function formatLastSyncedTitle(ms: number | null): string | undefined {
  if (ms === null) {
    return undefined;
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date(ms));
}
