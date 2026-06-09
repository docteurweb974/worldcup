import type { IconName } from "./NavIcon";

/** Onglets de navigation, partagés entre la barre mobile et la sidebar desktop. */
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/equipes", label: "Mes équipes", icon: "star" },
  { href: "/calendrier", label: "Calendrier", icon: "calendar" },
  { href: "/classements", label: "Classements", icon: "standings" },
  { href: "/pronos", label: "Mes pronos", icon: "target" },
];

/** Un onglet est-il actif pour le chemin courant ? */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
