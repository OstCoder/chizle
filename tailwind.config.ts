import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090d",
          900: "#0c0d13",
          800: "#14161e",
          700: "#1c1f2a",
          600: "#262a38",
          500: "#3a3f51",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(249,115,22,0.25), 0 10px 40px -10px rgba(249,115,22,0.35)",
      },
      keyframes: {
        scan: {
          "0%": { top: "0%", opacity: "0" },
          "12%": { opacity: "0.9" },
          "88%": { opacity: "0.9" },
          "100%": { top: "100%", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scan: "scan 3.6s ease-in-out infinite",
        "fade-up": "fade-up 0.55s ease-out both",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse at top, rgba(249,115,22,0.12), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
