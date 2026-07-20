import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatches, isFinished, type Match } from "@/lib/api";

/**
 * Matchs avec des scores finaux RÉSILIENTS aux caprices de football-data
 * (offre gratuite : un match peut osciller TIMED↔FINISHED et son score
 * disparaître `null` après avoir été publié).
 *
 * Principe : dès qu'on observe un score valide, on l'enregistre dans la table
 * `match_results` (write-through). Ensuite on le réutilise toujours, même si la
 * source le perd → les points attribués ne s'effacent plus jamais.
 */
/**
 * Un score est-il « définitif » et cohérent (donc figeable) ?
 *  - composantes cohérentes si prolongation/TAB (fullTime = 90' + prolong. + TAB),
 *  - le vainqueur annoncé correspond au score (écarte un score transitoire),
 *  - pas de match nul en phase finale (impossible : un qualifié en sort toujours).
 */
function scoreSettled(m: Match): boolean {
  const h = m.score.fullTime.home;
  const a = m.score.fullTime.away;
  if (h == null || a == null) return false;
  const reg = m.score.regularTime;
  const et = m.score.extraTime;
  const pen = m.score.penalties;
  // Match allé au-delà de 90' : on EXIGE le score à 90' (regularTime). Sans lui,
  // fullTime inclut la prolongation/les TAB → on ne peut pas figer le 90' (sinon
  // on stockerait le fullTime à tort, comme la finale 1-0 a.p. dont le 90' est 0-0).
  const beyond90 = m.score.duration === "EXTRA_TIME" || m.score.duration === "PENALTY_SHOOTOUT";
  if (beyond90 && (reg == null || reg.home == null || reg.away == null)) return false;
  if (reg != null) {
    if (h !== (reg.home ?? 0) + (et?.home ?? 0) + (pen?.home ?? 0)) return false;
    if (a !== (reg.away ?? 0) + (et?.away ?? 0) + (pen?.away ?? 0)) return false;
  }
  const outcome = h > a ? "H" : h < a ? "A" : "D";
  const winner =
    m.score.winner === "HOME_TEAM"
      ? "H"
      : m.score.winner === "AWAY_TEAM"
        ? "A"
        : m.score.winner === "DRAW"
          ? "D"
          : null;
  if (winner == null || outcome !== winner) return false; // vainqueur ≠ score → transitoire
  if (m.stage !== "GROUP_STAGE" && outcome === "D") return false; // nul impossible en KO
  return true;
}

export async function getResilientMatches(): Promise<Match[]> {
  const matches = await getMatches();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return matches; // pas de clé service : on renvoie le flux brut
  }

  // `match_results` n'est pas dans les types générés → accès typé localement.
  // home/away = fullTime (affichage) ; reg_home/reg_away = score à 90' (scoring).
  type ResultRow = {
    match_id: number;
    home: number;
    away: number;
    reg_home: number | null;
    reg_away: number | null;
    pen_home: number | null;
    pen_away: number | null;
  };
  const db = admin as unknown as {
    from: (table: string) => {
      select: (cols: string) => Promise<{ data: ResultRow[] | null }>;
      upsert: (rows: ResultRow[], opts: { onConflict: string }) => Promise<{ error: unknown }>;
    };
  };

  // Résultats déjà mémorisés.
  const { data: stored } = await db
    .from("match_results")
    .select("match_id, home, away, reg_home, reg_away, pen_home, pen_away");
  // Auto-réparation : on ignore un score mémorisé que le flux live contredit
  // franchement (vainqueur opposé). Il sera re-figé proprement au passage suivant.
  const liveById = new Map(matches.map((m) => [m.id, m]));
  const known = new Map<number, KnownResult>();
  for (const r of stored ?? []) {
    const live = liveById.get(r.match_id);
    if (live && isFinished(live.status) && live.score.winner) {
      const so = r.home > r.away ? "H" : r.home < r.away ? "A" : "D";
      const wo =
        live.score.winner === "HOME_TEAM" ? "H" : live.score.winner === "AWAY_TEAM" ? "A" : "D";
      if (so !== wo) continue; // vainqueur mémorisé ≠ live → on l'écarte (re-capture propre)
      // Score à 90' mémorisé ≠ 90' live (cas finale figée à tort sur le fullTime a.p.) :
      // si le live est définitif, on écarte pour re-capturer le bon 90'.
      const lr = live.score.regularTime;
      if (
        lr?.home != null &&
        lr?.away != null &&
        scoreSettled(live) &&
        (r.reg_home !== lr.home || r.reg_away !== lr.away)
      ) {
        continue;
      }
    }
    known.set(r.match_id, {
      home: r.home,
      away: r.away,
      regHome: r.reg_home,
      regAway: r.reg_away,
      penHome: r.pen_home,
      penAway: r.pen_away,
    });
  }

  // Write-through : on ne capture un score QUE si le match est réellement terminé.
  // « Réellement » = statut FINISHED ET au moins 110 min écoulées depuis le coup
  // d'envoi (90' + mi-temps + arrêts de jeu) — garde-fou contre un statut qui
  // glitche en « FINISHED » alors que le match est encore en cours.
  const now = Date.now();
  const MIN_ELAPSED_MS = 110 * 60 * 1000;
  const toStore: ResultRow[] = [];
  for (const m of matches) {
    const h = m.score.fullTime.home;
    const a = m.score.fullTime.away;
    // Score à 90' (temps réglementaire) : present si prolongation/TAB, sinon = fullTime.
    const reg = m.score.regularTime;
    const regHome = reg?.home ?? h;
    const regAway = reg?.away ?? a;
    // Tirs au but (si séance) : pour afficher le vrai score (fullTime − TAB).
    const pen = m.score.penalties;
    const penHome = pen?.home ?? null;
    const penAway = pen?.away ?? null;
    // On ne fige un score que s'il est définitif ET cohérent (cf. scoreSettled) :
    // évite de figer un score transitoire (ex. 2-2 alors que le match finit 2-1)
    // ou une capture en pleine séance de tirs au but.
    const elapsed = now - new Date(m.utcDate).getTime();
    if (
      isFinished(m.status) &&
      elapsed >= MIN_ELAPSED_MS &&
      h != null &&
      a != null &&
      scoreSettled(m) &&
      !known.has(m.id)
    ) {
      known.set(m.id, { home: h, away: a, regHome, regAway, penHome, penAway });
      toStore.push({
        match_id: m.id,
        home: h,
        away: a,
        reg_home: regHome,
        reg_away: regAway,
        pen_home: penHome,
        pen_away: penAway,
      });
    }
  }
  if (toStore.length > 0) {
    await db.from("match_results").upsert(toStore, { onConflict: "match_id" });
  }

  return overlay(matches, known);
}

/** Un seul match, avec score résilient (réutilise getResilientMatches). */
export async function getResilientMatch(id: number): Promise<Match | undefined> {
  return (await getResilientMatches()).find((m) => m.id === id);
}

/** Score mémorisé : fullTime + score à 90' + TAB éventuels (peuvent être null). */
type KnownResult = {
  home: number;
  away: number;
  regHome: number | null;
  regAway: number | null;
  penHome: number | null;
  penAway: number | null;
};

/** Applique les scores mémorisés au flux live (force le statut « terminé »). */
function overlay(matches: Match[], known: Map<number, KnownResult>): Match[] {
  // On superpose les scores mémorisés (et on force le statut « terminé »).
  return matches.map((m) => {
    const r = known.get(m.id);
    if (!r) return m;
    const winner =
      m.score.winner ??
      (r.home > r.away ? "HOME_TEAM" : r.home < r.away ? "AWAY_TEAM" : "DRAW");
    const score: Match["score"] = { ...m.score, winner, fullTime: { home: r.home, away: r.away } };
    // Restaure aussi le score à 90' mémorisé (résilience du scoring phases finales).
    if (r.regHome != null && r.regAway != null) {
      score.regularTime = { home: r.regHome, away: r.regAway };
    }
    // …et les TAB mémorisés (résilience de l'affichage du vrai score).
    if (r.penHome != null && r.penAway != null) {
      score.penalties = { home: r.penHome, away: r.penAway };
    }
    return {
      ...m,
      status: isFinished(m.status) ? m.status : "FINISHED",
      score,
    };
  });
}
