import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { formatGroup, type Match } from "@/lib/api";
import { TEAM_BY_ID } from "@/data/teams";

const ScoreSchema = z.object({
  home: z.number().int(),
  away: z.number().int(),
});

const clamp = (n: number) => Math.max(0, Math.min(20, Math.round(Number(n) || 0)));

function teamName(team: Match["homeTeam"]): string {
  const t = team.id != null ? TEAM_BY_ID[team.id] : undefined;
  return t?.nameFr ?? team.name ?? "À déterminer";
}

/**
 * Demande à Claude un score plausible pour un match. Renvoie null si la clé
 * API est absente ou en cas d'échec (le bot saute simplement ce match).
 */
export async function predictScore(match: Match): Promise<{ home: number; away: number } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const home = teamName(match.homeTeam);
  const away = teamName(match.awayTeam);
  const stage = match.group ? formatGroup(match.group) : match.stage.replaceAll("_", " ");

  const prompt =
    `Tu es un pronostiqueur expert de football. Pour ce match de la Coupe du Monde 2026 ` +
    `(${stage}) opposant ${home} (à domicile) à ${away} (à l'extérieur), donne un score final ` +
    `plausible en tenant compte de la force relative des deux sélections. Réponds par un score ` +
    `réaliste (buts entiers, généralement entre 0 et 4 par équipe).`;

  try {
    const res = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(ScoreSchema) },
    });
    const parsed = res.parsed_output;
    if (!parsed) return null;
    return { home: clamp(parsed.home), away: clamp(parsed.away) };
  } catch {
    return null;
  }
}
