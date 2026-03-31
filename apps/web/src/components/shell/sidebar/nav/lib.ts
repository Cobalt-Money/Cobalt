/** Two-letter initials for avatars from display name, falling back to email local-part. */
export function navUserInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts.at(-1)?.[0];
      if (a && b) {
        return `${a}${b}`.toUpperCase();
      }
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "";
  if (local.length > 0) {
    return local.slice(0, 2).toUpperCase();
  }
  return "?";
}
