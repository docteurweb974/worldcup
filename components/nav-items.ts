/** Onglets de navigation, partagés entre la barre mobile et la sidebar desktop. */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/equipes", label: "Mes équipes", icon: "⭐" },
  { href: "/calendrier", label: "Calendrier", icon: "📅" },
  { href: "/classements", label: "Classements", icon: "📊" },
  { href: "/pronos", label: "Mes pronos", icon: "🎯" },
];

/** Un onglet est-il actif pour le chemin courant ? */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
