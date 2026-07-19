/**
 * Annonces « Quoi de neuf » affichées aux joueurs connectés (1 par slide).
 *
 * Ordre = ordre d'affichage des slides (le plus récent/important en premier).
 * Chaque annonce a un `id` STABLE : une fois vue, elle n'est plus remontrée.
 * Pour annoncer une nouveauté : ajoute une entrée en HAUT avec un nouvel id.
 */
export interface Announcement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  href?: string; // si défini, le bouton de la slide y redirige
  cta?: string; // libellé du bouton de redirection
  from?: string; // ISO : l'annonce n'apparaît qu'à partir de cette date/heure
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "final-double-bonus",
    emoji: "🏆",
    title: "La finale : points doublés + paris bonus !",
    description:
      "Sur la grande finale, tous tes points comptent DOUBLE (score exact 10 pts, bon résultat 4 pts). Et 4 paris bonus t'attendent (mi-temps la plus prolifique, +/- 2,5 buts, les deux équipes marquent, résultat à la mi-temps) : +3 pts chacun. Ne les rate pas avant le coup d'envoi !",
    href: "/pronos",
    cta: "Jouer la finale 🏆",
    from: "2026-07-19T00:00:00+02:00",
  },
  {
    id: "community-details",
    emoji: "🔎",
    title: "Les pronos de la communauté en détail",
    description:
      "Sur la carte d'un match terminé, tu vois désormais le pronostic de chaque joueur : son score, son qualifié éventuel et les points gagnés. Compare tes paris à ceux des autres !",
    href: "/calendrier",
    cta: "Voir les matchs",
    from: "2026-07-12T00:00:00+02:00",
  },
  {
    id: "prediction-game",
    emoji: "🔮",
    title: "Nouveau jeu : Prédiction",
    description:
      "Devine la finale de la Coupe du Monde 2026 : choisis les 2 équipes qui iront en finale, le vainqueur et le score. Verrouillé à la fin des 8es.",
    href: "/champion",
    cta: "Composer ma finale 🔮",
    from: "2026-07-06T00:00:00+02:00",
  },
  {
    id: "knockout-qualifier",
    emoji: "🏆",
    title: "8es de finale : choisis le qualifié !",
    description:
      "Sur un match à élimination, si tu pronostiques un match nul, désigne l'équipe qui se qualifie (prolongation ou tirs au but). Bon qualifié = +2 pts bonus, cumulés avec ton score !",
    href: "/pronos",
    cta: "Faire mes pronos",
    from: "2026-07-04T00:00:00+02:00", // samedi 4 juillet (début des 8es)
  },
  {
    id: "knockout-90min",
    emoji: "🕒",
    title: "Phases finales : pronos sur 90 minutes",
    description:
      "Pour les matchs à élimination, tes pronostics sont jugés sur le score à la fin du temps réglementaire (90'). La prolongation et les tirs au but ne comptent pas pour les points.",
    href: "/pronos",
    cta: "Voir mes pronos",
  },
  {
    id: "survivor",
    emoji: "💀",
    title: "Le Mode Survivor",
    description:
      "Chaque tour, choisis 1 équipe qui doit gagner. Une erreur et tu es éliminé. Le dernier survivant remporte +10 pts au classement !",
    href: "/survivor",
    cta: "Découvrir le mode 💀",
  },
  {
    id: "player-predictions",
    emoji: "🔎",
    title: "Les pronos des autres joueurs",
    description:
      "Sur le profil d'un joueur, tu peux maintenant retrouver tous ses pronostics des matchs terminés.",
  },
  {
    id: "boost",
    emoji: "⚡",
    title: "Le Boost ×2",
    description:
      "Double les points d'UN match par journée de poules. Choisis bien : seulement 3 Boosts pour tout le tournoi !",
  },
  {
    id: "resumes",
    emoji: "🎬",
    title: "Les résumés vidéo",
    description:
      "Un résumé de chaque match terminé est maintenant disponible, à retrouver sur sa page et sur ton profil joueur.",
  },
  {
    id: "ai-player",
    emoji: "🤖",
    title: "Un joueur 100% IA dans la course",
    description:
      "« Agent IA 🤖 » pronostique tout seul et grimpe au classement. Sauras-tu battre la machine ?",
  },
  {
    id: "badges",
    emoji: "🏅",
    title: "Palmarès & Badges",
    description: "Débloque des badges au fil de tes exploits. Sauras-tu tous les débloquer ?",
  },
];
