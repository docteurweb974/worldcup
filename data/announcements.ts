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
}

export const ANNOUNCEMENTS: Announcement[] = [
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
