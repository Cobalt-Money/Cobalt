/** Two-letter initials for avatars from display name, falling back to email local-part. */
export function navUserInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const last = parts.at(-1);
      return `${parts[0][0]}${last?.[0] ?? ""}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] ?? "";
  return local.length > 0 ? local.slice(0, 2).toUpperCase() : "?";
}
