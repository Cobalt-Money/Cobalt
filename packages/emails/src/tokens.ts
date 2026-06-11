/**
 * Email-safe brand tokens. Email clients don't reliably render oklch/CSS vars,
 * so we maintain a parallel hex palette here, hand-tuned to approximate the
 * dark-theme `@cobalt-web/ui` surface. Update both together.
 */
export const colors = {
  background: "#0b0b0c",
  border: "#1f1f23",
  buttonBg: "#ffffff",
  buttonText: "#0b0b0c",
  surface: "#141416",
  textFaint: "#6b7280",
  textMuted: "#9ca3af",
  textPrimary: "#ffffff",
} as const;

export const radii = {
  button: "10px",
  card: "16px",
} as const;

export const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
