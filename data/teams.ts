/**
 * Les 48 nations qualifiées pour la Coupe du Monde 2026.
 *
 * Source : football-data.org, endpoint /v4/competitions/WC/teams (saison 2026).
 * - `id`  : identifiant football-data.org, utilisé pour joindre matchs et classements.
 * - `tla` : code 3 lettres ; c'est la CLÉ stable stockée dans `favoriteTeams` (localStorage).
 * - `nameFr` / `flag` : libellé et drapeau pour l'affichage (ajoutés manuellement).
 */
export interface Team {
  id: number;
  tla: string;
  nameFr: string;
  flag: string;
}

// Triées par nom français (ordre d'affichage par défaut dans « Mes équipes »).
export const TEAMS: Team[] = [
  { id: 774, tla: "RSA", nameFr: "Afrique du Sud", flag: "🇿🇦" },
  { id: 778, tla: "ALG", nameFr: "Algérie", flag: "🇩🇿" },
  { id: 759, tla: "GER", nameFr: "Allemagne", flag: "🇩🇪" },
  { id: 770, tla: "ENG", nameFr: "Angleterre", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 801, tla: "KSA", nameFr: "Arabie saoudite", flag: "🇸🇦" },
  { id: 762, tla: "ARG", nameFr: "Argentine", flag: "🇦🇷" },
  { id: 779, tla: "AUS", nameFr: "Australie", flag: "🇦🇺" },
  { id: 816, tla: "AUT", nameFr: "Autriche", flag: "🇦🇹" },
  { id: 805, tla: "BEL", nameFr: "Belgique", flag: "🇧🇪" },
  { id: 1060, tla: "BIH", nameFr: "Bosnie-Herzégovine", flag: "🇧🇦" },
  { id: 764, tla: "BRA", nameFr: "Brésil", flag: "🇧🇷" },
  { id: 828, tla: "CAN", nameFr: "Canada", flag: "🇨🇦" },
  { id: 1930, tla: "CPV", nameFr: "Cap-Vert", flag: "🇨🇻" },
  { id: 818, tla: "COL", nameFr: "Colombie", flag: "🇨🇴" },
  { id: 772, tla: "KOR", nameFr: "Corée du Sud", flag: "🇰🇷" },
  { id: 1935, tla: "CIV", nameFr: "Côte d'Ivoire", flag: "🇨🇮" },
  { id: 799, tla: "CRO", nameFr: "Croatie", flag: "🇭🇷" },
  { id: 9460, tla: "CUW", nameFr: "Curaçao", flag: "🇨🇼" },
  { id: 8873, tla: "SCO", nameFr: "Écosse", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: 825, tla: "EGY", nameFr: "Égypte", flag: "🇪🇬" },
  { id: 791, tla: "ECU", nameFr: "Équateur", flag: "🇪🇨" },
  { id: 760, tla: "ESP", nameFr: "Espagne", flag: "🇪🇸" },
  { id: 771, tla: "USA", nameFr: "États-Unis", flag: "🇺🇸" },
  { id: 773, tla: "FRA", nameFr: "France", flag: "🇫🇷" },
  { id: 763, tla: "GHA", nameFr: "Ghana", flag: "🇬🇭" },
  { id: 836, tla: "HAI", nameFr: "Haïti", flag: "🇭🇹" },
  { id: 8062, tla: "IRQ", nameFr: "Irak", flag: "🇮🇶" },
  { id: 840, tla: "IRN", nameFr: "Iran", flag: "🇮🇷" },
  { id: 766, tla: "JPN", nameFr: "Japon", flag: "🇯🇵" },
  { id: 8049, tla: "JOR", nameFr: "Jordanie", flag: "🇯🇴" },
  { id: 815, tla: "MAR", nameFr: "Maroc", flag: "🇲🇦" },
  { id: 769, tla: "MEX", nameFr: "Mexique", flag: "🇲🇽" },
  { id: 8872, tla: "NOR", nameFr: "Norvège", flag: "🇳🇴" },
  { id: 783, tla: "NZL", nameFr: "Nouvelle-Zélande", flag: "🇳🇿" },
  { id: 8070, tla: "UZB", nameFr: "Ouzbékistan", flag: "🇺🇿" },
  { id: 1836, tla: "PAN", nameFr: "Panama", flag: "🇵🇦" },
  { id: 761, tla: "PAR", nameFr: "Paraguay", flag: "🇵🇾" },
  { id: 8601, tla: "NED", nameFr: "Pays-Bas", flag: "🇳🇱" },
  { id: 765, tla: "POR", nameFr: "Portugal", flag: "🇵🇹" },
  { id: 8030, tla: "QAT", nameFr: "Qatar", flag: "🇶🇦" },
  { id: 1934, tla: "COD", nameFr: "RD Congo", flag: "🇨🇩" },
  { id: 804, tla: "SEN", nameFr: "Sénégal", flag: "🇸🇳" },
  { id: 792, tla: "SWE", nameFr: "Suède", flag: "🇸🇪" },
  { id: 788, tla: "SUI", nameFr: "Suisse", flag: "🇨🇭" },
  { id: 798, tla: "CZE", nameFr: "Tchéquie", flag: "🇨🇿" },
  { id: 802, tla: "TUN", nameFr: "Tunisie", flag: "🇹🇳" },
  { id: 803, tla: "TUR", nameFr: "Turquie", flag: "🇹🇷" },
  { id: 758, tla: "URY", nameFr: "Uruguay", flag: "🇺🇾" },
];

/** Index par TLA (clé des favoris) pour des accès O(1). */
export const TEAM_BY_TLA: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.tla, t]),
);

/** Index par id football-data.org (jointures avec les matchs / classements). */
export const TEAM_BY_ID: Record<number, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
);
