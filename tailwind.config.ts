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
        "counter-pop": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
        "flame-ignite": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.25) rotate(-4deg)" },
          "50%": { transform: "scale(1.12) rotate(3deg)" },
          "75%": { transform: "scale(1.18) rotate(-2deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
      },
      animation: {
        scan: "scan 3.6s ease-in-out infinite",
        "fade-up": "fade-up 0.55s ease-out both",
        "counter-pop": "counter-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "flame-ignite": "flame-ignite 0.8s ease-in-out 2",
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
