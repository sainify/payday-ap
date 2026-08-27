import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#F3F6F3",
          "bg-dark": "#0B1210",
          surface: "#FFFFFF",
          "surface-dark": "#141E1A",
          raised: "#FFFFFF",
          "raised-dark": "#1A2521",
        },
        ink: {
          DEFAULT: "#122421",
          soft: "#4B5C57",
          faint: "#8A9C96",
          inverted: "#EAF2EF",
        },
        primary: {
          DEFAULT: "#0E4F45",
          soft: "#DEEAE6",
          dark: "#0A3B33",
          bright: "#1F8F73",
        },
        brass: { DEFAULT: "#B8862E", soft: "#F3E7CE" },
        mint: { DEFAULT: "#1B8F6B", soft: "#DCF0E6" },
        coral: { DEFAULT: "#BD5236", soft: "#F5E2DA" },
        amber: { DEFAULT: "#B8862E", soft: "#F3E7CE" },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        clay: "24px",
        "clay-sm": "16px",
        "clay-lg": "32px",
      },
      boxShadow: {
        "clay-raised": "0 16px 40px rgba(14,40,34,0.10), 0 2px 8px rgba(14,40,34,0.05)",
        "clay-raised-sm": "0 10px 24px rgba(14,40,34,0.08)",
        "clay-inset": "inset 0 1px 3px rgba(14,40,34,0.06)",
        "clay-raised-dark": "0 16px 36px rgba(0,0,0,0.45)",
        "clay-inset-dark": "inset 0 1px 3px rgba(0,0,0,0.4)",
      },
      transitionTimingFunction: {
        clay: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
