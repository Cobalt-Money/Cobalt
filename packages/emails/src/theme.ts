/**
 * Email theme adapted from the Resend "Protocol" demo template
 * (https://github.com/resend/react-email/tree/canary/apps/demo/emails/03-Protocol).
 * Hex colors only — email clients don't reliably render oklch/CSS vars.
 */
import type { TailwindConfig } from "react-email";
import plugin from "tailwindcss/plugin";

const colors = {
  bg: "#131313",
  "bg-2": "#212121",
  brand: "#3B82F6",
  fg: "#FFFFFF",
  "fg-2": "#C4C4C4",
  "fg-3": "#818181",
  muted: "#4A4A4A",
  stroke: "#2B2B2B",
} as const;

const fontScale = {
  11: { fontSize: "11px", fontWeight: "300", letterSpacing: "0.3px", lineHeight: "1.5" },
  13: { fontSize: "13px", fontWeight: "300", letterSpacing: "0.2px", lineHeight: "1.5" },
  14: { fontSize: "14px", fontWeight: "350", letterSpacing: "0.3px", lineHeight: "1.5" },
  15: { fontSize: "15px", fontWeight: "450", letterSpacing: "-0.075px", lineHeight: "1.5" },
  20: { fontSize: "20px", fontWeight: "500", lineHeight: "1.1" },
  24: { fontSize: "24px", fontWeight: "500", letterSpacing: "-0.072px", lineHeight: "1.5" },
  32: { fontSize: "32px", fontWeight: "500", letterSpacing: "0.4px", lineHeight: "0.9" },
  40: { fontSize: "40px", fontWeight: "500", letterSpacing: "-1.2px", lineHeight: "1" },
  56: { fontSize: "56px", fontWeight: "500", letterSpacing: "-1.68px", lineHeight: "1" },
} as const;

export const emailTailwindConfig: TailwindConfig = {
  plugins: [
    plugin(({ addUtilities, addVariant }) => {
      addVariant("mobile", "@media (max-width: 600px)");
      const utilities: Record<string, Record<string, string>> = {};
      for (const [step, token] of Object.entries(fontScale)) {
        utilities[`.font-${step}`] = token;
      }
      addUtilities(utilities);
    }),
  ],
  theme: {
    extend: {
      colors,
      fontFamily: {
        condensed: ["'IBM Plex Sans Condensed'", "'Arial Narrow'", "Arial", "sans-serif"],
        mono: ["'IBM Plex Mono'", "'Courier New'", "monospace"],
        sans: ["Inter", "Arial", "sans-serif"],
      },
    },
  },
};
