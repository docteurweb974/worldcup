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
      colors: {
        // Couleurs d'accent pilotées par des variables CSS injectées dynamiquement
        // (cf. couleurs adaptatives selon l'équipe favorite).
        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
        },
      },
      minHeight: {
        tap: "44px", // cible tactile minimale (accessibilité mobile)
      },
      minWidth: {
        tap: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
