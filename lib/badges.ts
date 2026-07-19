/** Catalogue des badges (logique pure, réutilisable côté client comme serveur). */

export interface PlayerStats {
  predictions: number; // nombre de pronostics enregistrés
  exact: number; // scores exacts trouvés
  good: number; // bons résultats (issue correcte, score inexact)
  played: number; // pronostics sur des matchs terminés
  points: number; // total de points
  streak: number; // plus longue série de bons pronos (points > 0)
  fullMatchdays: number; // journées/tours entièrement pronostiqués
  rank: number; // rang au classement (0 si non classé)
  hasFavorite: boolean; // équipe favorite définie
  knockoutExact: boolean; // un score exact en phase finale
  cleanSheetExact: boolean; // un score exact sur un match à clean sheet
  // Décomposition du total de points (somme = points).
  breakdown: {
    pronos: number; // points de base des pronos (hors ×2)
    boost: number; // points supplémentaires du Boost ×2
    qualifier: number; // bonus « qualifié » (8es+)
    survivor: number; // bonus Survivor (+10)
    champion: number; // bonus Prédiction (finale)
    finalBets: number; // bonus paris de la finale
  };
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: (s: PlayerStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first", emoji: "🥉", title: "Recrue", description: "Enregistrer son premier pronostic", earned: (s) => s.predictions >= 1 },
  { id: "loyalty", emoji: "🛡️", title: "Loyauté", description: "Choisir une équipe favorite", earned: (s) => s.hasFavorite },
  { id: "deadeye", emoji: "🎯", title: "Deadeye", description: "Trouver 1 score exact", earned: (s) => s.exact >= 1 },
  { id: "hattrick", emoji: "🎩", title: "Hat-trick", description: "Trouver 3 scores exacts", earned: (s) => s.exact >= 3 },
  { id: "sniper", emoji: "🔭", title: "Sniper", description: "Trouver 5 scores exacts", earned: (s) => s.exact >= 5 },
  { id: "inform", emoji: "🔥", title: "In-Form", description: "3 bons pronostics d'affilée", earned: (s) => s.streak >= 3 },
  { id: "maestro", emoji: "🎼", title: "Maestro", description: "Pronostiquer tous les matchs d'une journée", earned: (s) => s.fullMatchdays >= 1 },
  { id: "engine", emoji: "⚙️", title: "Engine", description: "Pronostiquer au moins 30 matchs", earned: (s) => s.predictions >= 30 },
  { id: "cleansheet", emoji: "🧱", title: "Clean Sheet", description: "Score exact d'un match à clean sheet (une équipe sans but encaissé)", earned: (s) => s.cleanSheetExact },
  { id: "trivela", emoji: "⚡", title: "Trivela", description: "Score exact d'un match à élimination directe", earned: (s) => s.knockoutExact },
  { id: "icon", emoji: "🪙", title: "Icône", description: "Atteindre 100 points", earned: (s) => s.points >= 100 },
  { id: "totw", emoji: "⭐", title: "Team of the Week", description: "Être dans le top 3 du classement", earned: (s) => s.rank >= 1 && s.rank <= 3 },
  { id: "ballondor", emoji: "🏆", title: "Ballon d'Or", description: "Être 1er du classement", earned: (s) => s.rank === 1 },
];

export function earnedCount(stats: PlayerStats): number {
  return BADGES.filter((b) => b.earned(stats)).length;
}
