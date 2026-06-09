# World Cup Fun ⚽🏆

Webapp de suivi de la **Coupe du Monde 2026** (USA / Canada / Mexique, 11 juin → 19 juillet 2026).
Pensée pour les Réunionnais 🌴 et les Français métropolitains 🇫🇷 : équipes favorites, scores en direct,
classements, pronostics, export calendrier et bascule de fuseau horaire France / Péi.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS v3** (dark mode en stratégie `class`)
- **localStorage** pour toutes les préférences (pas d'authentification en V1)
- API **football-data.org** (matchs, scores live, classements)
- Déploiement **Vercel**

## Démarrage

```bash
npm install
cp .env.local.example .env.local   # puis renseigner FOOTBALL_DATA_API_KEY
npm run dev
```

Application sur http://localhost:3000.

## Variables d'environnement

| Variable                | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `FOOTBALL_DATA_API_KEY` | Clé API football-data.org (offre gratuite : 10 req/min). |

## Structure

```
app/         Routes et pages (App Router)
components/   Composants réutilisables
lib/          Logique métier (API, fuseaux, génération .ics)
data/         Données statiques (équipes, couleurs pays)
hooks/        Hooks React (ex. useLocalStorage)
```
