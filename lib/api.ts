/**
 * Wrapper football-data.org (API v4) pour la Coupe du Monde 2026 (compétition WC).
 *
 * Auth : en-tête `X-Auth-Token`. Offre gratuite = 10 requêtes/minute, d'où des
 * durées de revalidation côté serveur volontairement prudentes.
 */
const BASE = "https://api.football-data.org/v4";
const WC = "competitions/WC";

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export interface MatchTeam {
  id: number | null;
  name: string | null;
  tla: string | null;
  crest: string | null;
}

export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  stage: string;
  group: string | null;
  matchday: number | null;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

export interface StandingRow {
  position: number;
  team: MatchTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface StandingGroup {
  stage: string;
  group: string | null;
  table: StandingRow[];
}

/** En-têtes d'authentification ; lève une erreur claire si la clé manque. */
function authHeaders(): HeadersInit {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error(
      "FOOTBALL_DATA_API_KEY manquante. Copier .env.local.example en .env.local.",
    );
  }
  return { "X-Auth-Token": key };
}

/** Fetch générique avec revalidation ISR et gestion d'erreurs. */
async function fdFetch<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: authHeaders(),
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`football-data.org a répondu ${res.status} sur « ${path} ».`);
  }
  return (await res.json()) as T;
}

/**
 * Tous les matchs de la Coupe du Monde.
 * revalidate court (30 s) pour rafraîchir les scores en direct.
 */
export async function getMatches(): Promise<Match[]> {
  const data = await fdFetch<{ matches: Match[] }>(`${WC}/matches`, 30);
  return data.matches ?? [];
}

/**
 * Classements par poule (type TOTAL uniquement).
 * Cache 5 min : les classements bougent peu.
 */
export async function getStandings(): Promise<StandingGroup[]> {
  const data = await fdFetch<{ standings: (StandingGroup & { type: string })[] }>(
    `${WC}/standings`,
    300,
  );
  return (data.standings ?? []).filter((s) => s.type === "TOTAL");
}

export interface Scorer {
  player: string;
  teamName: string;
  teamTla: string | null;
  goals: number;
  assists: number | null;
}

/** Meilleurs buteurs de la Coupe du Monde (football-data /scorers). */
export async function getScorers(): Promise<Scorer[]> {
  const data = await fdFetch<{
    scorers: {
      player: { name: string };
      team: { name: string; tla: string | null };
      goals: number;
      assists: number | null;
    }[];
  }>(`${WC}/scorers?limit=20`, 300);
  return (data.scorers ?? []).map((s) => ({
    player: s.player?.name ?? "?",
    teamName: s.team?.name ?? "",
    teamTla: s.team?.tla ?? null,
    goals: s.goals ?? 0,
    assists: s.assists ?? null,
  }));
}

/** Un match est-il en cours (score live à afficher) ? */
export function isLive(status: MatchStatus): boolean {
  return status === "IN_PLAY" || status === "PAUSED";
}

/** Un match est-il terminé (résultat exploitable pour les pronos) ? */
export function isFinished(status: MatchStatus): boolean {
  return status === "FINISHED" || status === "AWARDED";
}

/** Filtre les matchs impliquant au moins une des équipes favorites (par TLA). */
export function filterByFavorites(matches: Match[], favoriteTlas: string[]): Match[] {
  if (favoriteTlas.length === 0) return [];
  const set = new Set(favoriteTlas);
  return matches.filter(
    (m) =>
      (m.homeTeam.tla && set.has(m.homeTeam.tla)) ||
      (m.awayTeam.tla && set.has(m.awayTeam.tla)),
  );
}

/** Issue d'un match du point de vue du pronostic. */
export type Outcome = "home" | "draw" | "away";

/** Récupère un match par son id (réutilise la liste en cache, aucune requête en plus). */
export async function getMatch(id: number): Promise<Match | undefined> {
  const matches = await getMatches();
  return matches.find((m) => m.id === id);
}

/** Convertit le `score.winner` de l'API en issue de pronostic. */
export function outcomeFromWinner(winner: Match["score"]["winner"]): Outcome | null {
  if (winner === "HOME_TEAM") return "home";
  if (winner === "AWAY_TEAM") return "away";
  if (winner === "DRAW") return "draw";
  return null;
}

/** Clé de regroupement par « tour » : Journée X (poules) ou nom de la phase finale. */
export function roundKey(m: Match): string {
  if (m.stage === "GROUP_STAGE") return `J${m.matchday ?? 0}`;
  return m.stage;
}

/**
 * Normalise un libellé de poule (« GROUP_A » des matchs ou « Group A » des
 * classements) en « Groupe A ».
 */
export function formatGroup(group: string | null): string {
  if (!group) return "";
  const letter = group.replace(/^group[_ ]?/i, "").trim();
  return letter ? `Groupe ${letter}` : group;
}
