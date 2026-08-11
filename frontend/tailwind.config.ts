import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#ECEFF4",
          "bg-dark": "#12141B",
          surface: "#F5F7FC",
          "surface-dark": "#1B1F29",
          raised: "#FAFBFE",
          "raised-dark": "#222733",
        },
        ink: {
          DEFAULT: "#1B1E27",
          soft: "#5B6070",
          faint: "#8A8FA3",
          inverted: "#EDEFF5",
        },
        primary: {
          DEFAULT: "#4B4FE0",
          soft: "#E4E4FB",
          dark: "#3A3DBD",
        },
        mint: { DEFAULT: "#16A97C", soft: "#DCF4EB" },
        coral: { DEFAULT: "#E1574F", soft: "#FBE4E2" },
        amber: { DEFAULT: "#D6952E", soft: "#F8ECD8" },
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        clay: "28px",
        "clay-sm": "18px",
        "clay-lg": "36px",
      },
      boxShadow: {
        "clay-raised":
          "8px 8px 20px rgba(163,170,192,0.45), -8px -8px 20px rgba(255,255,255,0.85)",
        "clay-raised-sm":
          "5px 5px 12px rgba(163,170,192,0.4), -5px -5px 12px rgba(255,255,255,0.8)",
        "clay-inset":
          "inset 4px 4px 10px rgba(163,170,192,0.4), inset -4px -4px 10px rgba(255,255,255,0.7)",
        "clay-raised-dark":
          "8px 8px 18px rgba(0,0,0,0.55), -6px -6px 16px rgba(255,255,255,0.03)",
        "clay-inset-dark":
          "inset 4px 4px 10px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.03)",
      },
      transitionTimingFunction: {
        clay: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
