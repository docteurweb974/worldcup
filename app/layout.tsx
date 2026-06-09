import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { AppShell } from "@/components/AppShell";

// Typo « athletic / competition » recommandée par le skill ui-ux-pro-max :
// Barlow Condensed (titres) + Barlow (corps).
const display = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Barlow({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const title = "World Cup Fun — Coupe du Monde 2026";
const description =
  "Suivez la Coupe du Monde 2026 : matchs de vos équipes favorites, scores en direct, classements et pronostics. Heures affichées à l'heure de France ou de La Réunion.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "World Cup Fun",
  keywords: [
    "Coupe du Monde 2026",
    "football",
    "calendrier",
    "scores en direct",
    "classements",
    "pronostics",
    "La Réunion",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "fr_FR",
    siteName: "World Cup Fun",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
    <html lang="fr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
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
