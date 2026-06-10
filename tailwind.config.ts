import type { Config } from "tailwindcss";

const config: Config = {
  // Stratégie « class » : le dark mode s'active via la classe `dark` sur <html>.
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        // Couleurs d'accent pilotées par des variables CSS injectées dynamiquement
        // (cf. couleurs adaptatives selon l'équipe favorite).
        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
        },
        // CTA vert « event green » (skill ui-ux-pro-max).
        cta: {
          DEFAULT: "var(--color-cta)",
          fg: "var(--color-cta-fg)",
        },
      },
      minHeight: {
        tap: "44px", // cible tactile minimale (accessibilité mobile)
      },
      minWidth: {
        tap: "44px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bump: {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        kenburns: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.12)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out both",
        bump: "bump 0.3s ease-out",
        kenburns: "kenburns 20s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
