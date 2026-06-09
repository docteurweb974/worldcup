import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "World Cup Fun — Coupe du Monde 2026",
  description:
    "Suivez la Coupe du Monde 2026 : matchs de vos équipes favorites, scores en direct, classements et pronostics. Heures à l'heure de France ou de La Réunion 🌴.",
};

export const viewport: Viewport = {
  themeColor: "#002395",
};

/*
  Script anti-flash (FOUC) du dark mode : exécuté avant le rendu pour appliquer
  la classe `dark` sur <html>. On respecte prefers-color-scheme uniquement au
  tout premier chargement (aucune préférence stockée).
*/
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <PreferencesProvider>
          <AppShell>{children}</AppShell>
        </PreferencesProvider>
      </body>
    </html>
  );
}
