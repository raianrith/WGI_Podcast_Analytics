import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#121826",
          soft: "#1E293B",
          muted: "#6B7280",
          faint: "#9CA3AF",
        },
        paper: {
          DEFAULT: "#F6F4F0",
          warm: "#FBF9F6",
          card: "#FFFFFF",
          hairline: "rgb(18 24 38 / 0.06)",
        },
        yt: "#E11D48",
        apple: "#737373",
        spotify: "#1DB954",
        accent: {
          DEFAULT: "#C45C26",
          soft: "#E8A87C",
          muted: "rgb(196 92 38 / 0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(18,24,38,0.04), 0 4px 16px rgba(18,24,38,0.04)",
        lift: "0 2px 4px rgba(18,24,38,0.04), 0 12px 28px rgba(18,24,38,0.08)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
