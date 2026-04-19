export interface AuroraThemePreset {
  background: string;
  border: string;
  id: string;
  name: string;
}

/** Curated aurora themes (original demo + variants). */
export const AURORA_THEME_PRESETS: readonly AuroraThemePreset[] = [
  {
    background: "#110026",
    border:
      "linear-gradient(90deg, rgba(140, 68, 36, 0.5) 0%, rgba(245, 62, 2, 0.4) 25%, rgba(255, 182, 0, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "original",
    name: "Original",
  },
  {
    background: "#1A1520",
    border:
      "linear-gradient(90deg, rgba(140, 68, 36, 0.5) 0%, rgba(245, 62, 2, 0.4) 25%, rgba(255, 182, 0, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "sunset",
    name: "Sunset",
  },
  {
    background: "#151E2D",
    border:
      "linear-gradient(90deg, rgba(0, 87, 255, 0.5) 0%, rgba(0, 144, 255, 0.4) 25%, rgba(0, 200, 255, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "ocean",
    name: "Ocean",
  },
  {
    background: "#1A2023",
    border:
      "linear-gradient(90deg, rgba(20, 83, 45, 0.5) 0%, rgba(34, 197, 94, 0.4) 25%, rgba(163, 230, 53, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "forest",
    name: "Forest",
  },
  {
    background: "#1F1A2E",
    border:
      "linear-gradient(90deg, rgba(88, 28, 135, 0.5) 0%, rgba(168, 85, 247, 0.4) 25%, rgba(216, 180, 254, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "galaxy",
    name: "Galaxy",
  },
  {
    background: "#4A2B2D",
    border:
      "linear-gradient(90deg, rgba(251, 146, 140, 0.5) 0%, rgba(251, 113, 133, 0.4) 25%, rgba(244, 63, 94, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "coral",
    name: "Coral",
  },
  {
    background: "#2D4A3E",
    border:
      "linear-gradient(90deg, rgba(167, 243, 208, 0.5) 0%, rgba(110, 231, 183, 0.4) 25%, rgba(52, 211, 153, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "mint",
    name: "Mint",
  },
  {
    background: "#FFB600",
    border:
      "linear-gradient(90deg, rgba(253, 224, 71, 0.5) 0%, rgba(250, 204, 21, 0.4) 25%, rgba(234, 179, 8, 0.3) 50%, rgba(255, 255, 255, 0.6) 100%)",
    id: "yellow",
    name: "Yellow",
  },
] as const;
