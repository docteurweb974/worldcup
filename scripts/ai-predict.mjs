// @ts-nocheck
/**
 * Joueur IA « Agent IA 🤖 » — pronostics automatiques.
 *
 * Lancé par GitHub Actions (tous les 2 jours). Script Node autonome, sans
 * dépendance à Next.js. Pour chaque match débutant dans les ~72 h, non encore
 * pronostiqué par le bot, il :
 *   1) recherche les prédictions Opta/The Analyst + l'actualité (recherche web) ;
 *   2) en déduit un score réaliste (en tenant compte des résultats et classements
 *      déjà connus) ;
 *   3) enregistre le prono dans Supabase.
 *
 * Variables d'environnement requises :
 *   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   FOOTBALL_DATA_API_KEY, AI_BOT_USER_ID
 * Optionnelles : AI_MODEL (défaut claude-haiku-4-5), AI_WINDOW_HOURS (défaut 72),
 *   AI_MAX_SEARCHES (défaut 2), AI_DEBUG (logue la synthèse).
 */
import Anthropic from "@anthropic-ai/sdk";

const env = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`✖ Variable d'environnement manquante : ${k}`);
    process.exit(1);
  }
  return v;
};

const ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY");
const SUPABASE_URL = env("SUPABASE_URL").replace(/\/$/, "");
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const FOOTBALL_KEY = env("FOOTBALL_DATA_API_KEY");
const BOT_ID = env("AI_BOT_USER_ID");

// Recherche = Sonnet (sait extraire les chiffres Opta) ; scoring = Haiku (économe).
const RESEARCH_MODEL = process.env.AI_RESEARCH_MODEL || "claude-sonnet-4-6";
const SCORING_MODEL = process.env.AI_SCORING_MODEL || "claude-haiku-4-5";
const WINDOW_H = Number(process.env.AI_WINDOW_HOURS || 72);
const MAX_SEARCHES = Number(process.env.AI_MAX_SEARCHES || 2);
const MAX_BATCH = 30;
const DEBUG = !!process.env.AI_DEBUG;

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ───────────────────────── football-data.org ─────────────────────────
async function fd(path) {
  const res = await fetch(`https://api.football-data.org/v4/${path}`, {
    headers: { "X-Auth-Token": FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`football-data ${res.status} sur ${path}`);
  return res.json();
}
const getMatches = async () => (await fd("competitions/WC/matches")).matches ?? [];
const getStandings = async () =>
  ((await fd("competitions/WC/standings")).standings ?? []).filter((s) => s.type === "TOTAL");

const isFinished = (s) => s === "FINISHED" || s === "AWARDED";
const canPredict = (s) => s === "SCHEDULED" || s === "TIMED";
const formatGroup = (g) => {
  if (!g) return "";
  const l = g.replace(/^group[_ ]?/i, "").trim();
  return l ? `Groupe ${l}` : g;
};
const label = (t) => t?.name || (t?.id ? `#${t.id}` : "À déterminer");
const clamp = (n) => Math.max(0, Math.min(9, Math.round(Number(n) || 0)));

// ───────────────────────── Supabase (REST) ─────────────────────────
const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};
async function existingPredictions() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/predictions?user_id=eq.${BOT_ID}&select=match_id`,
    { headers: sbHeaders },
  );
  if (!res.ok) throw new Error(`Supabase GET ${res.status} : ${await res.text()}`);
  return res.json();
}
async function upsertPrediction(matchId, home, away) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/predictions`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ user_id: BOT_ID, match_id: matchId, home, away }]),
  });
  if (!res.ok) throw new Error(`Supabase upsert ${res.status} : ${await res.text()}`);
}

// ───────────────────────── Contexte tournoi ─────────────────────────
function recentForm(teamId, all) {
  if (teamId == null) return "à déterminer";
  const played = all
    .filter((m) => isFinished(m.status) && (m.homeTeam.id === teamId || m.awayTeam.id === teamId))
    .filter((m) => m.score?.fullTime?.home != null)
    .sort((a, b) => +new Date(b.utcDate) - +new Date(a.utcDate))
    .slice(0, 5)
    .map((m) => `${label(m.homeTeam)} ${m.score.fullTime.home}-${m.score.fullTime.away} ${label(m.awayTeam)}`);
  return played.length ? played.join(" ; ") : "aucun match joué dans ce tournoi";
}
function standingsText(g) {
  const rows = g.table.map(
    (r) =>
      `${r.position}. ${label(r.team)} — ${r.points} pts (J${r.playedGames} ${r.won}V ${r.draw}N ${r.lost}D, ${r.goalsFor}-${r.goalsAgainst})`,
  );
  return `${formatGroup(g.group) || g.stage}\n${rows.join("\n")}`;
}

// ───────────────────────── Le cerveau ─────────────────────────
async function predictBatch(targets, all, standings) {
  const result = new Map();
  if (targets.length === 0) return result;

  const fixtures = targets
    .map((m) => {
      const stage = m.group ? formatGroup(m.group) : String(m.stage).replaceAll("_", " ");
      return `#${m.id} — ${label(m.homeTeam)} (dom.) vs ${label(m.awayTeam)} (ext.) [${stage}]`;
    })
    .join("\n");

  // Contexte gratuit : forme récente + classements des poules concernées.
  const ids = new Set();
  targets.forEach((m) => {
    if (m.homeTeam.id != null) ids.add(m.homeTeam.id);
    if (m.awayTeam.id != null) ids.add(m.awayTeam.id);
  });
  const forms = [...ids]
    .map((id) => {
      const t =
        all.find((m) => m.homeTeam.id === id)?.homeTeam ??
        all.find((m) => m.awayTeam.id === id)?.awayTeam;
      return `${t ? label(t) : `#${id}`} : ${recentForm(id, all)}`;
    })
    .join("\n");
  const targetGroups = new Set(targets.filter((m) => m.group).map((m) => formatGroup(m.group)));
  const tables = standings
    .filter((g) => g.group && targetGroups.has(formatGroup(g.group)) && g.table.length > 0)
    .map(standingsText)
    .join("\n\n");
  const context =
    `Forme récente (matchs déjà joués dans cette Coupe du Monde) :\n${forms || "aucun match encore joué"}\n\n` +
    `Classements de poule actuels :\n${tables || "pas encore de classement"}`;

  // Étape 1 — recherche web (streaming obligatoire : appel long).
  let digest = "";
  try {
    const research = await client.messages
      .stream({
        model: RESEARCH_MODEL,
        max_tokens: 1800,
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: MAX_SEARCHES,
            // requis pour que Haiku appelle l'outil directement
            allowed_callers: ["direct"],
          },
        ],
        messages: [
          {
            role: "user",
            content:
              `Coupe du Monde 2026. Matchs à venir à analyser :\n${fixtures}\n\n` +
              `Effectue ${MAX_SEARCHES} recherches web ciblées maximum pour récupérer :\n` +
              `1) les prédictions data d'Opta / The Analyst pour ces affiches (probabilités de ` +
              `victoire/nul, points attendus « xPTS », % de qualification « QUAL ») ;\n` +
              `2) l'actualité récente : forme, blessures, suspensions, compositions probables.\n` +
              `Privilégie les chiffres d'Opta. Rédige une synthèse FACTUELLE et concise (2-3 lignes ` +
              `par équipe, en citant les probabilités trouvées). Ne donne pas encore de score.`,
          },
        ],
      })
      .finalMessage();
    digest = research.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (DEBUG) console.log("\n===== SYNTHÈSE =====\n" + digest + "\n====================\n");
  } catch (e) {
    console.error("⚠ Recherche (étape 1) échouée, on poursuit sans :", e?.message);
  }

  // Étape 2 — score par match (JSON strict, sans outil).
  const res = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content:
          `Tu es un pronostiqueur expert. En t'appuyant sur :\n\n` +
          `=== Analyse (recherche récente) ===\n${digest || "(non disponible)"}\n\n` +
          `=== Contexte du tournoi ===\n${context}\n\n` +
          `=== Matchs à pronostiquer ===\n${fixtures}\n\n` +
          `Donne pour CHAQUE match un score final plausible (buts entiers réalistes, ` +
          `généralement 0 à 4 par équipe). Réponds UNIQUEMENT avec du JSON valide, sans texte ` +
          `autour, au format : {"predictions":[{"match_id":<int>,"home":<int>,"away":<int>}]} ` +
          `couvrant tous les matchs listés.`,
      },
    ],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Réponse de scoring non parsable :\n" + text.slice(0, 400));
  }
  const valid = new Set(targets.map((m) => m.id));
  for (const p of parsed?.predictions ?? []) {
    if (valid.has(p.match_id)) result.set(p.match_id, { home: clamp(p.home), away: clamp(p.away) });
  }
  return result;
}

// ───────────────────────── Programme principal ─────────────────────────
async function main() {
  const now = Date.now();
  const [matches, standings, existing] = await Promise.all([
    getMatches(),
    getStandings().catch(() => []),
    existingPredictions(),
  ]);

  const done = new Set(existing.map((p) => p.match_id));
  const targets = matches
    .filter((m) => canPredict(m.status) && !done.has(m.id))
    .filter((m) => {
      const t = new Date(m.utcDate).getTime();
      return t > now && t <= now + WINDOW_H * 3600 * 1000;
    })
    // les deux équipes doivent être connues (sinon affiche de phase finale pas encore fixée)
    .filter((m) => m.homeTeam.id != null && m.awayTeam.id != null)
    .sort((a, b) => +new Date(a.utcDate) - +new Date(b.utcDate))
    .slice(0, MAX_BATCH);

  console.log(
    `Fenêtre ${WINDOW_H} h | recherche ${RESEARCH_MODEL} + scoring ${SCORING_MODEL} | ${targets.length} match(s) à pronostiquer.`,
  );
  if (targets.length === 0) {
    console.log("Rien à faire (aucun nouveau match dans la fenêtre). Aucun appel facturé.");
    return;
  }

  const scores = await predictBatch(targets, matches, standings);

  let n = 0;
  for (const m of targets) {
    const s = scores.get(m.id);
    if (!s) continue;
    await upsertPrediction(m.id, s.home, s.away);
    n += 1;
    console.log(`  ✓ #${m.id} ${label(m.homeTeam)} ${s.home}-${s.away} ${label(m.awayTeam)}`);
  }
  console.log(`Terminé : ${n}/${targets.length} prono(s) enregistré(s).`);
}

main().catch((e) => {
  console.error("✖ Échec :", e?.message || e);
  process.exit(1);
});
