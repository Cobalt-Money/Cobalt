/**
 * Fixed dev-controlled tag palette. Source of truth for the DB CHECK constraint
 * on `tag.color` and shared with web/mobile UI. To add a color: append to TAG_COLORS,
 * add hex to TAG_COLOR_HEX, then ship a migration that drops + re-adds
 * `tag_color_check` with the new list.
 */
export const TAG_COLORS = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
  "rose",
  "slate",
  "stone",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_HEX: Record<TagColor, string> = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  green: "#22c55e",
  indigo: "#6366f1",
  lime: "#84cc16",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#a855f7",
  red: "#ef4444",
  rose: "#f43f5e",
  slate: "#64748b",
  stone: "#78716c",
  teal: "#14b8a6",
  violet: "#8b5cf6",
  yellow: "#eab308",
};

export const DEFAULT_TAG_COLOR: TagColor = "blue";

export function isTagColor(value: string): value is TagColor {
  return (TAG_COLORS as readonly string[]).includes(value);
}
