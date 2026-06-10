/** Catalogue des badges (logique pure, réutilisable côté client comme serveur). */

export interface PlayerStats {
  predictions: number; // nombre de pronostics enregistrés
  exact: number; // scores exacts trouvés
  points: number; // total de points
  streak: number; // plus longue série de bons pronos (points > 0)
  fullMatchdays: number; // journées/tours entièrement pronostiqués
  rank: number; // rang au classement (0 si non classé)
  hasFavorite: boolean; // équipe favorite définie
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: (s: PlayerStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first", emoji: "⚽", title: "Premier pas", description: "Enregistrer son premier pronostic", earned: (s) => s.predictions >= 1 },
  { id: "exact1", emoji: "🎯", title: "Dans le mille", description: "Trouver 1 score exact", earned: (s) => s.exact >= 1 },
  { id: "exact5", emoji: "🔮", title: "Boule de cristal", description: "Trouver 5 scores exacts", earned: (s) => s.exact >= 5 },
  { id: "streak3", emoji: "🔥", title: "En feu", description: "3 bons pronostics d'affilée", earned: (s) => s.streak >= 3 },
  { id: "fullday", emoji: "📋", title: "Carton plein", description: "Pronostiquer tous les matchs d'une journée", earned: (s) => s.fullMatchdays >= 1 },
  { id: "cent", emoji: "💯", title: "Centurion", description: "Atteindre 100 points", earned: (s) => s.points >= 100 },
  { id: "podium", emoji: "👑", title: "Sur le podium", description: "Être dans le top 3 du classement", earned: (s) => s.rank >= 1 && s.rank <= 3 },
  { id: "assidu", emoji: "🌍", title: "Assidu", description: "Pronostiquer au moins 30 matchs", earned: (s) => s.predictions >= 30 },
  { id: "colors", emoji: "🏴", title: "Couleurs au cœur", description: "Choisir une équipe favorite", earned: (s) => s.hasFavorite },
];

export function earnedCount(stats: PlayerStats): number {
  return BADGES.filter((b) => b.earned(stats)).length;
}
