import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "white" is remapped via CSS variables so every existing
        // `text-white/55`, `bg-white/[0.02]`, `border-white/10` utility
        // automatically flips between true-white (dark mode) and a dark
        // text colour (light mode) without touching any component files.
        white: "rgb(var(--color-white) / <alpha-value>)",
        ink: {
          950: "rgb(var(--color-ink-950) / <alpha-value>)",
          900: "rgb(var(--color-ink-900) / <alpha-value>)",
          800: "rgb(var(--color-ink-800) / <alpha-value>)",
          700: "rgb(var(--color-ink-700) / <alpha-value>)",
          600: "rgb(var(--color-ink-600) / <alpha-value>)",
          500: "rgb(var(--color-ink-500) / <alpha-value>)",
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
        "counter-pop":
          "counter-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
