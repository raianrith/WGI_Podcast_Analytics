import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B2A41",
          dark: "#0F1C2E",
          light: "#2A3F5F",
        },
        teal: {
          DEFAULT: "#0D9488",
          light: "#14B8A6",
          muted: "#99F6E4",
        },
        slate: {
          wash: "#F4F7FA",
          border: "#E2E8F0",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-libre)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(27, 42, 65, 0.08), 0 8px 24px rgba(27, 42, 65, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
