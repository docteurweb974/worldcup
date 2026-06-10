import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { formatGroup, isFinished, type Match, type StandingGroup } from "@/lib/api";
import { displayTeam } from "@/data/teams";

const clamp = (n: number) => Math.max(0, Math.min(20, Math.round(Number(n) || 0)));
const label = (t: Match["homeTeam"]) => displayTeam(t.id, t.name).nameFr;

const PredictionsSchema = z.object({
  predictions: z.array(
    z.object({
      match_id: z.number().int(),
      home: z.number().int(),
      away: z.number().int(),
    }),
  ),
});

/** Forme récente d'une équipe dans le tournoi (matchs déjà joués). */
function recentForm(teamId: number | null, allMatches: Match[]): string {
  if (teamId == null) return "aucun match joué";
  const played = allMatches
    .filter((m) => isFinished(m.status) && (m.homeTeam.id === teamId || m.awayTeam.id === teamId))
    .filter((m) => m.score.fullTime.home != null)
    .sort((a, b) => +new Date(b.utcDate) - +new Date(a.utcDate))
    .slice(0, 5)
    .map((m) => `${label(m.homeTeam)} ${m.score.fullTime.home}-${m.score.fullTime.away} ${label(m.awayTeam)}`);
  return played.length ? played.join(" ; ") : "aucun match joué dans ce tournoi";
}

/** Tableau d'une poule, formaté en texte. */
function standingsText(group: StandingGroup): string {
  const rows = group.table.map(
    (r) => `${r.position}. ${label(r.team)} — ${r.points} pts (J${r.playedGames} ${r.won}V ${r.draw}N ${r.lost}D, ${r.goalsFor}-${r.goalsAgainst})`,
  );
  return `${formatGroup(group.group) || group.stage}\n${rows.join("\n")}`;
}

/** Demande à Claude un score pour chaque match du lot (recherche web puis JSON). */
export async function predictBatch(
  targets: Match[],
  allMatches: Match[],
  standings: StandingGroup[],
): Promise<Map<number, { home: number; away: number }>> {
  const result = new Map<number, { home: number; away: number }>();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || targets.length === 0) return result;

  const client = new Anthropic({ apiKey });

  const fixtures = targets
    .map((m) => {
      const stage = m.group ? formatGroup(m.group) : m.stage.replaceAll("_", " ");
      return `#${m.id} — ${label(m.homeTeam)} (dom.) vs ${label(m.awayTeam)} (ext.) [${stage}]`;
    })
    .join("\n");

  // Contexte tournoi : forme récente des équipes concernées + classements des poules concernées.
  const teamIds = new Set<number>();
  targets.forEach((m) => {
    if (m.homeTeam.id != null) teamIds.add(m.homeTeam.id);
    if (m.awayTeam.id != null) teamIds.add(m.awayTeam.id);
  });
  const forms = [...teamIds]
    .map((id) => {
      const t = allMatches.find((m) => m.homeTeam.id === id)?.homeTeam ?? allMatches.find((m) => m.awayTeam.id === id)?.awayTeam;
      const name = t ? label(t) : `#${id}`;
      return `${name} : ${recentForm(id, allMatches)}`;
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

  // Étape 1 — recherche web + analyse de la forme.
  let digest = "";
  try {
    const research = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2500,
      thinking: { type: "adaptive" },
      tools: [
        { type: "web_search_20260209", name: "web_search" },
        { type: "web_fetch_20260209", name: "web_fetch" },
      ],
      messages: [
        {
          role: "user",
          content:
            `Coupe du Monde 2026. Matchs à venir à analyser :\n${fixtures}\n\n` +
            `Consulte en priorité les analyses data de The Analyst : ` +
            `https://theanalyst.com/competition/fifa-world-cup (et ses articles/previews liés à ces ` +
            `équipes et matchs), puis complète par des recherches web. Récupère les informations ` +
            `récentes pertinentes (forme actuelle, blessures, suspensions, compositions probables, ` +
            `indicateurs statistiques, dynamique) et rédige une synthèse concise (quelques lignes par ` +
            `équipe). Ne donne pas encore de score.`,
        },
      ],
    });
    digest = research.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  } catch {
    digest = "";
  }

  // Étape 2 — score par match (JSON structuré, sans recherche).
  try {
    const res = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content:
            `Tu es un pronostiqueur expert. En t'appuyant sur :\n\n` +
            `=== Analyse de forme (recherche récente) ===\n${digest || "(non disponible)"}\n\n` +
            `=== Contexte du tournoi ===\n${context}\n\n` +
            `=== Matchs à pronostiquer ===\n${fixtures}\n\n` +
            `Donne pour CHAQUE match un score final plausible (buts entiers réalistes, généralement 0-4 par ` +
            `équipe), en tenant compte de la force des équipes et des infos ci-dessus. Réponds avec un objet ` +
            `{ "predictions": [ { "match_id", "home", "away" } ] } couvrant tous les matchs listés.`,
        },
      ],
      output_config: { format: zodOutputFormat(PredictionsSchema) },
    });
    const parsed = res.parsed_output;
    const valid = new Set(targets.map((m) => m.id));
    for (const p of parsed?.predictions ?? []) {
      if (valid.has(p.match_id)) result.set(p.match_id, { home: clamp(p.home), away: clamp(p.away) });
    }
  } catch {
    /* échec : on renvoie ce qu'on a (souvent rien) ; le prochain run réessaiera */
  }

  return result;
}
